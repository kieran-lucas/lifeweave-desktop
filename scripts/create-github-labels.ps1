$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI is required."
}

gh auth status | Out-Null

$labels = @(
    @("type:feature", "0E8A16", "Product feature"),
    @("type:bug", "D73A4A", "Defect"),
    @("type:decision", "5319E7", "Product or architecture decision"),
    @("type:prototype", "FBCA04", "Prototype-gated work"),
    @("type:security", "B60205", "Security or privacy"),
    @("type:performance", "1D76DB", "Performance"),
    @("type:accessibility", "0052CC", "Accessibility"),
    @("type:testing", "C5DEF5", "Testing"),
    @("area:foundation", "D4C5F9", "Foundation"),
    @("area:task", "BFDADC", "Task System"),
    @("area:calendar", "BFD4F2", "Calendar"),
    @("area:analytics", "F9D0C4", "Analytics"),
    @("area:life", "C2E0C6", "Life System"),
    @("area:document", "F6D5A8", "Leaf documents"),
    @("area:backup", "E6E6E6", "Backup/restore"),
    @("priority:P0", "B60205", "Critical"),
    @("priority:P1", "D93F0B", "High"),
    @("priority:P2", "FBCA04", "Normal"),
    @("priority:P3", "C5DEF5", "Later"),
    @("decision:locked", "0E8A16", "Locked decision"),
    @("decision:prototype-gated", "FBCA04", "Requires prototype gate"),
    @("decision:open", "5319E7", "Open decision"),
    @("decision:deferred", "D4C5F9", "Deferred"),
    @("decision:removed", "000000", "Removed from product"),
    @("needs-spec", "EDEDED", "Needs specification"),
    @("needs-ai-review", "1D76DB", "Needs writer-independent AI review"),
    @("needs-human-acceptance", "D4C5F9", "Needs Product Owner UX acceptance"),
    @("data-risk", "B60205", "Potential data integrity risk")
)

foreach ($label in $labels) {
    $name, $color, $description = $label
    gh label create $name --color $color --description $description --force
}

Write-Host "GitHub labels created/updated." -ForegroundColor Green
