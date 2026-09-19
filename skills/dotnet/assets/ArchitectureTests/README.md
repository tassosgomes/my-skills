# ArchitectureTests — template

Copy into `tests/ProjectName.ArchitectureTests/` and replace `ProjectName` plus the anchor types
in `ProjectArchitecture.cs`. These files reference types that only exist in a real solution, so
they are **not compile-verified here** — the first run in your solution is the verification.

Run in `Debug` (the `dotnet test` default): ArchUnitNET reads IL and Release may optimise
dependencies away.

`Guid.NewGuid()`, `DateTime.Now`, `Migrate()` and friends are **not** checked here —
`BannedSymbols.txt` fails the build earlier and more cheaply.
