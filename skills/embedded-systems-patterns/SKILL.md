---
name: embedded-systems-patterns
description: Expert reference for embedded systems development — resource-constrained design, real-time patterns, and hardware-software integration
version: 1.0.0
---

# Embedded Systems Patterns

## Non-Negotiable Standards

- Every byte of RAM and every cycle of CPU is a design resource. Account for them explicitly.
- Interrupt service routines (ISRs) must be fast and minimal. No blocking calls, no heap allocation, no complex logic inside an ISR.
- All shared data between ISRs and main context must be protected. Use volatile, atomic operations, or critical sections — never assume the compiler or CPU preserves access order.
- Determinism over throughput. In real-time systems, a missed deadline is a correctness failure, not a performance issue.
- Hardware is not trustworthy. Validate every value read from hardware: range check, sanity check, CRC/checksum where applicable.
- If it's safety-critical → it has a watchdog. The watchdog is always the last defense, never the first.
- Never use dynamic memory allocation (`malloc`/`free`) in production firmware unless the allocator is deterministic and bounded (static pool allocator, TLSF). Heap fragmentation on embedded is a time-bomb.
- Firmware is versioned, and the version is readable at runtime. Always. No exceptions.

## Decision Rules

- If data is shared between an ISR and main context → declare it `volatile`; use `__disable_irq()`/`__enable_irq()` (or equivalent) for multi-byte access
- If a task takes > N microseconds → it does not belong in an ISR; defer to a task via a flag, queue, or semaphore
- If you need a timer → use a hardware timer peripheral, not a software delay loop. `delay_ms()` burns CPU and breaks RTOS scheduling.
- If you're choosing between polling and interrupts → polling is fine up to ~1kHz; above that or for irregular events, use interrupts
- If you need inter-task communication → message queue (no shared state). Not a global variable with a flag.
- If stack depth is unknown → measure it. Instrument with stack painting (fill with `0xDEAD`, observe high water mark). Never guess.
- If a peripheral register is write-only → shadow it in RAM. Never read-modify-write without a shadow.
- If you're writing a state machine → encode it as an explicit enum + transition table. Never use deeply nested if/else as a state machine.
- If you're doing floating point on a Cortex-M0/M0+ → you're doing software float. Budget the cycle cost (~100 cycles/op). Use fixed-point if throughput matters.
- If a communication protocol frame arrives → validate length, validate CRC/checksum, validate field ranges — before any processing. Malformed frames must be discarded, not processed.
- Never use `printf` in production firmware (pulls in large stdio, non-deterministic). Use a ring-buffer-backed UART logger with fixed-width format strings.
- Never #define magic numbers without a comment explaining the source (register mask, protocol constant, timing value derived from clock speed).

## Common Mistakes and Fixes

**Mistake: Unprotected multi-byte shared variable**
Bad:
```c
// In ISR:
g_timestamp = get_tick(); // 32-bit write, two 16-bit bus transactions on some cores

// In main:
if (g_timestamp > THRESHOLD) { ... } // may read torn value
```
Good:
```c
volatile uint32_t g_timestamp;

// In ISR: write atomically or use critical section
// In main:
__disable_irq();
uint32_t ts = g_timestamp;
__enable_irq();
if (ts > THRESHOLD) { ... }
```

**Mistake: Blocking inside an ISR**
Bad:
```c
void UART_IRQHandler(void) {
    char buf[64];
    HAL_UART_Receive(&huart1, buf, 64, 100); // 100ms timeout in ISR — system halted
}
```
Good: Set a flag or push to a ring buffer in the ISR. Process in main loop or a deferred task.

**Mistake: Using `memset` on hardware register structs**
Bad: `memset(&DMA1->LISR, 0, sizeof(DMA_TypeDef));` — writes to read-only status registers
Good: Write to specific registers only. Read the reference manual for clear-on-write vs write-1-to-clear semantics.

**Mistake: Uninitialized peripheral before enabling interrupt**
Bad: Enable NVIC interrupt, then configure peripheral — ISR fires before peripheral is ready
Good: Always: configure peripheral fully → clear pending flags → enable peripheral interrupt → enable NVIC entry

**Mistake: Stack overflow detection absent**
Bad: Stack overflows silently corrupt heap or .data; bug manifests far from the cause
Good: Enable MPU stack guard region, or RTOS stack overflow hook, or stack painting. Make stack overflow a hard fault with a clear diagnostic.

**Mistake: Timeout-free communication wait**
Bad: `while (!(USART1->SR & USART_SR_TXE));` — infinite spin if peripheral locks up
Good: `uint32_t deadline = tick_ms() + TIMEOUT_MS; while (!(USART1->SR & USART_SR_TXE)) { if (tick_ms() > deadline) return ERR_TIMEOUT; }`

## Good vs Bad Output

**Bad state machine:**
```c
void process(uint8_t event) {
    if (state == 0) {
        if (event == 1) { state = 1; do_a(); }
        else if (event == 2) { if (flag) { state = 3; } else { state = 2; } }
    } else if (state == 1) { ... } // 200 lines of nested if/else
}
```

**Good state machine:**
```c
typedef enum { ST_IDLE, ST_ACTIVE, ST_ERROR, ST_COUNT } State;
typedef enum { EV_START, EV_DATA, EV_ERROR, EV_COUNT } Event;

typedef State (*TransitionFn)(void);

static State on_idle_start(void)  { do_a(); return ST_ACTIVE; }
static State on_active_data(void) { process_data(); return ST_ACTIVE; }
static State on_any_error(void)   { log_error(); return ST_ERROR; }

static const TransitionFn fsm[ST_COUNT][EV_COUNT] = {
    [ST_IDLE][EV_START]   = on_idle_start,
    [ST_ACTIVE][EV_DATA]  = on_active_data,
    [ST_ACTIVE][EV_ERROR] = on_any_error,
};

void process(Event ev) {
    TransitionFn fn = fsm[current_state][ev];
    if (fn) current_state = fn();
}
```

**Bad driver init sequence:**
```c
HAL_NVIC_EnableIRQ(DMA1_Stream0_IRQn); // IRQ enabled too early
HAL_DMA_Init(&hdma);
HAL_UART_Init(&huart1);
```

**Good driver init sequence:**
```c
HAL_DMA_Init(&hdma);
HAL_UART_Init(&huart1);
__HAL_UART_CLEAR_FLAG(&huart1, UART_FLAG_ORE | UART_FLAG_NE | UART_FLAG_FE);
HAL_NVIC_SetPriority(USART1_IRQn, 5, 0);
HAL_NVIC_EnableIRQ(USART1_IRQn); // last
```

## Expert Vocabulary and Mental Models

**Real-time**: Correctness depends on timing, not just output value. Hard real-time = missed deadline is a failure. Soft real-time = occasional misses are tolerable.

**Critical section**: A code region where interrupts are disabled (or a mutex is held in RTOS context) to ensure atomicity of a multi-step operation.

**ISR latency vs ISR execution time**: Latency = time from event to ISR entry (hardware + NVIC preemption). Execution time = cycles inside the ISR. Both must be bounded.

**Stack painting**: Initialize the stack with a known sentinel value (e.g., `0xDEADBEEF`). At runtime, scan for the high-water mark — where the sentinel was overwritten — to measure actual stack usage.

**Fixed-point arithmetic**: Represent fractional values as integers scaled by a power of 2 (Q15, Q31 formats). Deterministic, fast on CPUs without FPU. Requires careful tracking of the scaling factor through operations.

**DMA (Direct Memory Access)**: Hardware that moves data between peripherals and memory without CPU involvement. Frees the CPU but introduces cache coherency issues on cores with D-cache — explicit cache invalidation required.

**RTOS task priorities**: Assign priorities by deadline, not importance. The task with the tightest deadline gets the highest priority (Rate Monotonic Scheduling).

**Watchdog timer (WDT)**: Hardware timer that resets the MCU if not "kicked" within a timeout period. Proves the system is making forward progress. Kick only from a known-good state, not unconditionally.

**Write-1-to-clear (W1C)**: A register bit-clearing mechanism where writing 1 clears the flag (not writing 0). Common in status/interrupt flag registers. Read-modify-write with OR mask, not AND mask.

**Volatile keyword**: Tells the compiler not to optimize reads/writes to a variable — the value may change outside the compiler's knowledge (hardware register, ISR-modified variable). Does NOT provide atomicity.
