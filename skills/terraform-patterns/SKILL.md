---
name: terraform-patterns
description: Production Terraform patterns covering modules, remote state, workspaces, variables, provider pinning, testing, import, drift, and common pitfalls
version: 1.0
---
# Terraform Patterns Expert Reference

## Non-Negotiable Standards

1. **Never store Terraform state locally in team environments.** Remote state backends (S3+DynamoDB, GCS, Terraform Cloud) are mandatory. Local state causes split-brain when multiple engineers run `terraform apply` concurrently. Enable state locking (DynamoDB `LockID` attribute, GCS object lock) and encryption at rest (S3 SSE-KMS, GCS CMEK).
2. **All resources live inside child modules — never define resources directly in the root module.** The root module is an orchestration layer: it calls modules, passes variables, wires outputs. Direct resources in root make reuse and testing impossible and create flat, unmaintainable code.
3. **Every module has `versions.tf` with explicit `required_providers` constraints.** Use `~> 5.0` for minor-version flexibility within a major version. Never use `>= 5.0` without an upper bound — a provider major version bump can break your module silently on `terraform init -upgrade`.
4. **Mark all secret variables `sensitive = true`.** Terraform will redact them from plan output and logs. Never hardcode secret values in `.tf` files or `terraform.tfvars` committed to version control. Use environment variables (`TF_VAR_db_password`) or a secrets backend (Vault, AWS SSM Parameter Store).
5. **Use `for_each` over `count` for any resource that is part of a list or map of similar resources.** `count`-indexed resources shift indices when an element is removed from the middle, causing Terraform to destroy and recreate all subsequent resources. `for_each` uses stable string keys.
6. **Run `terraform plan` as a mandatory PR artifact.** The plan output is the code review for infrastructure changes. Reviewers must see what will be created, modified, or destroyed before merge. Use `-out=plan.tfplan` and `show -json` for structured diff in CI.

## Decision Rules

1. **IF multiple environments share an identical resource structure (dev/staging/prod same topology) THEN use Terraform workspaces** with `terraform.workspace` interpolation for naming. IF environments diverge significantly in architecture (prod has WAF, dev does not) THEN use separate directories or repos with separate state files.
2. **IF a value is computed from other variables or locals THEN put it in `locals {}`, not a variable.** Variables are inputs from outside; locals are derived values. Mixing them forces callers to compute derivations the module should own.
3. **IF a module output will be consumed by another module or root THEN always define an `outputs.tf` file.** Never use `data.terraform_remote_state` to reach into another state file's resources directly — it creates tight coupling. Instead, pass outputs explicitly through module variables.
4. **IF you need to bring existing infrastructure under Terraform management THEN use `terraform import` followed by writing the matching HCL.** Run `terraform plan` after import and iterate until the plan shows "No changes." Use `moved` blocks when refactoring resource addresses to avoid destroy/recreate.
5. **IF renaming or moving a resource within a module THEN use a `moved` block instead of deleting and re-adding.** This preserves the existing infrastructure in place.
   ```hcl
   moved {
     from = aws_instance.old_name
     to   = aws_instance.new_name
   }
   ```
6. **IF a resource depends on another resource's side effect (not an attribute) THEN use `depends_on`.** But NEVER use `depends_on` on a module just because it feels right — it disables the dependency graph optimization for the entire module, forcing sequential execution. Only use it when there is a genuine implicit dependency Terraform cannot detect.
7. **IF scanning for security misconfigurations THEN run checkov in CI before `terraform apply`.** Command: `checkov -d . --framework terraform --quiet`. Also run `tflint` for provider-specific linting (e.g., invalid instance types, deprecated arguments).
8. **IF drift is detected between state and real infrastructure (e.g., manual console change) THEN run `terraform plan` to confirm, then either `terraform apply` to reconcile or `terraform import` the drift into state.** Never run `terraform state rm` to hide drift — this orphans real resources.
9. **NEVER run `terraform apply` against production without a reviewed, pinned plan file.** Use `terraform apply plan.tfplan` not `terraform apply` (which re-plans and can differ from the reviewed plan). In CI, generate the plan on PR, apply the exact same plan on merge.
10. **IF using a data source that reads live cloud state THEN be aware it is evaluated at plan time, not at the time the dependent resource was last applied.** A `data.aws_ami.latest` will return a different AMI on the next plan if a new AMI is published, potentially triggering unexpected instance replacements. Pin with a specific `filter` or store the AMI ID in a variable.

## Mental Models

**The Module Interface Contract**
A Terraform module is a black box with three surfaces: `variables.tf` (inputs — callers must satisfy these), `outputs.tf` (outputs — callers consume these), and `versions.tf` (provider constraints — callers must satisfy these). The internal `main.tf` and `locals.tf` are implementation details. A well-designed module can be upgraded internally without breaking callers as long as the interface (variable names, output names, types) is stable. Treat breaking changes to the interface the same as breaking changes to a library API — bump the module version.

**State as the Source of Truth Triangle**
Terraform maintains a triangle: HCL code (desired state), state file (last-known actual state), and real cloud infrastructure (current actual state). `terraform plan` computes the diff between code and state. Drift occurs when real infrastructure diverges from state (manual changes). The state file is not a backup or documentation — it contains sensitive resource attributes and must be encrypted, access-controlled, and backed up (S3 versioning or GCS object versioning). Corruption of state requires manual `terraform state` surgery.

**for_each vs count: Stable Keys vs. Shifting Indices**
`count = length(var.buckets)` creates `aws_s3_bucket.this[0]`, `[1]`, `[2]`. If you remove index 1, Terraform sees `[1]` is now the old `[2]` and destroys + recreates it. `for_each = toset(var.buckets)` creates `aws_s3_bucket.this["name-a"]`, `["name-b"]`. Removing `"name-b"` only touches that one resource. Use `count` only for truly binary toggles (`count = var.enabled ? 1 : 0`).

## Vocabulary

| Term | Precise Definition |
|------|-------------------|
| **Root module** | The top-level directory where `terraform init/plan/apply` is run; orchestrates child modules |
| **Child module** | A reusable module called by the root or another module via `module "name" {}` block |
| **State locking** | Mechanism (DynamoDB, GCS object lock) preventing concurrent state writes that cause corruption |
| **Workspace** | Named Terraform context sharing a backend config but with isolated state; `terraform workspace select prod` |
| **locals** | Computed values internal to a module; not exposed as inputs or outputs; evaluated at plan time |
| **sensitive = true** | Variable/output attribute that redacts value from CLI output, logs, and Terraform Cloud UI |
| **for_each** | Meta-argument iterating over a map or set with stable string keys; preferred over `count` for collections |
| **moved block** | HCL block recording a resource address rename, preventing destroy/recreate during refactoring |
| **terraform import** | CLI command associating an existing cloud resource with a Terraform resource address in state |
| **Terratest** | Go-based testing framework by Gruntwork for integration-testing Terraform modules against real cloud |
| **checkov** | Static analysis tool scanning Terraform HCL for security and compliance misconfigurations |
| **drift** | Divergence between Terraform state and actual cloud infrastructure, typically caused by manual changes |

## Common Mistakes and How to Avoid Them

**1. Everything in one main.tf with local state makes code unreusable and team collaboration impossible**

Bad:
```
# All resources directly in root, local state
myproject/
├── main.tf          # 800-line file with every resource
├── variables.tf
└── terraform.tfstate  # Committed to git (!)
```

Fix:
```
myproject/
├── main.tf          # Only module calls
├── variables.tf
├── outputs.tf
├── versions.tf
├── backend.tf       # S3 + DynamoDB remote state
└── modules/
    ├── networking/
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── outputs.tf
    │   └── versions.tf
    └── compute/
        ├── main.tf
        ├── variables.tf
        ├── outputs.tf
        └── versions.tf
```

backend.tf:
```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state-prod"
    key            = "services/myapp/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789:key/abc-123"
  }
}
```

**2. Using `count` for resource lists causes destroy/recreate on middle-element removal**

Bad:
```hcl
variable "bucket_names" {
  default = ["logs", "backups", "artifacts"]
}

resource "aws_s3_bucket" "this" {
  count  = length(var.bucket_names)
  bucket = var.bucket_names[count.index]
}
# Remove "backups" → "artifacts" shifts from index [2] to [1] → Terraform destroys and recreates it
```

Fix:
```hcl
variable "bucket_names" {
  type    = set(string)
  default = ["logs", "backups", "artifacts"]
}

resource "aws_s3_bucket" "this" {
  for_each = var.bucket_names
  bucket   = each.key
}
# Remove "backups" → only aws_s3_bucket.this["backups"] is destroyed; "artifacts" untouched
```

**3. Provider version unpinned allows major-version upgrade to silently break everything**

Bad:
```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0"    # Allows v5, v6, breaking changes
    }
  }
}
```

Fix:
```hcl
terraform {
  required_version = ">= 1.5.0, < 2.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"    # Allows 5.x, blocks 6.0
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}
```

**4. Hardcoded secrets in .tf files get committed to git and leak in plan output**

Bad:
```hcl
resource "aws_db_instance" "main" {
  username = "admin"
  password = "SuperSecret123!"   # In source code and tfstate
}
```

Fix:
```hcl
variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true    # Redacted from plan output and logs
}

resource "aws_db_instance" "main" {
  username = "admin"
  password = var.db_password
}
```
Set via CI/CD: `export TF_VAR_db_password=$(aws secretsmanager get-secret-value --secret-id prod/rds/password --query SecretString --output text)`

**5. `depends_on` on an entire module serializes its internal graph, killing parallelism**

Bad:
```hcl
module "compute" {
  source     = "./modules/compute"
  depends_on = [module.networking]   # Serializes ALL compute resources, even unrelated ones
}
```

Fix: Pass the actual attribute as a variable so Terraform can infer the dependency:
```hcl
module "compute" {
  source     = "./modules/compute"
  subnet_ids = module.networking.private_subnet_ids   # Implicit dependency on specific outputs
  vpc_id     = module.networking.vpc_id
}
# Only resources that use these values wait; others parallelize freely
```

## Good vs. Bad Output

**Bad module structure (flat, local state, count, no outputs):**
```hcl
# main.tf — everything in root, 600+ lines
provider "aws" {
  region = "us-east-1"   # Provider config in root (never in modules)
}

resource "aws_vpc" "main" { ... }
resource "aws_subnet" "public" {
  count = 3
  # index-based, shifts on removal
}
resource "aws_instance" "web" {
  count = length(var.instance_names)
  # No module boundary — compute and networking tangled
}
# No outputs.tf — consumers can't reference values
# No versions.tf — provider version uncontrolled
# No backend config — state is local terraform.tfstate
```

**Good module structure (modular, remote state, for_each, outputs):**
```hcl
# root/versions.tf
terraform {
  required_version = ">= 1.5.0, < 2.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.31"
    }
  }
}

# root/backend.tf
terraform {
  backend "s3" {
    bucket         = "acme-tfstate-prod"
    key            = "platform/main/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "acme-terraform-locks"
    encrypt        = true
  }
}

# root/main.tf — only module calls
module "networking" {
  source       = "./modules/networking"
  environment  = var.environment
  cidr_block   = var.vpc_cidr
  az_count     = 3
}

module "compute" {
  source      = "./modules/compute"
  environment = var.environment
  vpc_id      = module.networking.vpc_id
  subnet_ids  = module.networking.private_subnet_ids
  instance_configs = var.instance_configs   # map(object) — for_each inside module
}

# modules/networking/outputs.tf
output "vpc_id" {
  description = "VPC ID for compute modules to consume"
  value       = aws_vpc.main.id
}
output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = [for s in aws_subnet.private : s.id]
}

# modules/compute/main.tf
resource "aws_instance" "this" {
  for_each      = var.instance_configs          # Stable string keys
  ami           = each.value.ami
  instance_type = each.value.instance_type
  subnet_id     = var.subnet_ids[0]
  tags = {
    Name        = each.key
    Environment = var.environment
  }
}
```

## Checklist

- [ ] Remote backend configured with state locking (DynamoDB/GCS) and encryption at rest
- [ ] `versions.tf` present in every module with `required_version` and `required_providers` using `~>` constraints
- [ ] No provider configuration blocks inside child modules (only in root or provider-specific wrappers)
- [ ] All resources are inside child modules — root module contains only module calls, variables, outputs, backend, and provider
- [ ] `for_each` used for all collection-based resources; `count` only for binary toggles (`var.enabled ? 1 : 0`)
- [ ] All secret variables marked `sensitive = true`; no secret values hardcoded in `.tf` or `.tfvars` files committed to git
- [ ] `terraform plan -out=plan.tfplan` generated as PR artifact; `terraform apply plan.tfplan` used in CD pipeline
- [ ] `terraform validate` and `tflint` run in CI on every PR
- [ ] `checkov -d . --framework terraform` run in CI; critical findings block merge
- [ ] `moved` blocks used for any resource address refactoring (renaming, module restructuring)
- [ ] Drift detection scheduled as a cron CI job (`terraform plan`); team notified on non-empty plan
- [ ] `depends_on` usage reviewed — replaced with explicit variable passing wherever possible
