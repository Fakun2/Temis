param(
  [string]$Repo = "Fakun2/Temis"
)

$ErrorActionPreference = "Stop"

function Ensure-Label {
  param(
    [string]$Name,
    [string]$Color,
    [string]$Description
  )

  gh label create $Name --repo $Repo --color $Color --description $Description 2>$null
  if ($LASTEXITCODE -ne 0) {
    gh label edit $Name --repo $Repo --color $Color --description $Description
  }
}

$labels = @(
  @{ Name = "type:epic"; Color = "5319E7"; Description = "Epic or large functional block" },
  @{ Name = "type:feature"; Color = "0E8A16"; Description = "New product capability" },
  @{ Name = "type:bug"; Color = "D73A4A"; Description = "Defect or regression" },
  @{ Name = "type:docs"; Color = "0075CA"; Description = "Documentation" },
  @{ Name = "type:chore"; Color = "C5DEF5"; Description = "Maintenance or setup" },
  @{ Name = "type:refactor"; Color = "FBCA04"; Description = "Refactor without product change" },
  @{ Name = "type:test"; Color = "BFDADC"; Description = "Testing work" },
  @{ Name = "type:content"; Color = "D4C5F9"; Description = "Copywriting or content" },

  @{ Name = "area:web"; Color = "1D76DB"; Description = "Frontend Next.js" },
  @{ Name = "area:api"; Color = "1D76DB"; Description = "Backend API" },
  @{ Name = "area:database"; Color = "1D76DB"; Description = "Database and Prisma" },
  @{ Name = "area:auth"; Color = "1D76DB"; Description = "Authentication" },
  @{ Name = "area:tenant"; Color = "1D76DB"; Description = "Multitenancy" },
  @{ Name = "area:rbac"; Color = "1D76DB"; Description = "Roles and permissions" },
  @{ Name = "area:onboarding"; Color = "1D76DB"; Description = "Tenant onboarding" },
  @{ Name = "area:clients"; Color = "1D76DB"; Description = "Clients module" },
  @{ Name = "area:cases"; Color = "1D76DB"; Description = "Cases/expedientes module" },
  @{ Name = "area:documents"; Color = "1D76DB"; Description = "Documents module" },
  @{ Name = "area:tasks"; Color = "1D76DB"; Description = "Tasks module" },
  @{ Name = "area:finance"; Color = "1D76DB"; Description = "Finance module" },
  @{ Name = "area:integrations"; Color = "1D76DB"; Description = "External integrations" },
  @{ Name = "area:qa"; Color = "1D76DB"; Description = "Quality assurance" },
  @{ Name = "area:infra"; Color = "1D76DB"; Description = "Infra and deploy" },
  @{ Name = "area:docs"; Color = "1D76DB"; Description = "Project documentation" },

  @{ Name = "priority:p0"; Color = "B60205"; Description = "Critical/blocker" },
  @{ Name = "priority:p1"; Color = "D93F0B"; Description = "High priority" },
  @{ Name = "priority:p2"; Color = "FBCA04"; Description = "Medium priority" },
  @{ Name = "priority:p3"; Color = "C2E0C6"; Description = "Low priority" },

  @{ Name = "status:ready"; Color = "0E8A16"; Description = "Ready to start" },
  @{ Name = "status:in-progress"; Color = "FBCA04"; Description = "In progress" },
  @{ Name = "status:needs-review"; Color = "5319E7"; Description = "Waiting for review" },
  @{ Name = "status:blocked"; Color = "B60205"; Description = "Blocked by another issue" }
)

foreach ($label in $labels) {
  Ensure-Label -Name $label.Name -Color $label.Color -Description $label.Description
}

Write-Host "Labels created/updated for $Repo"
