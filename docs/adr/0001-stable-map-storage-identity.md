# Use an immutable Map UUID for storage identity

Local directory keys are useful implementation locators and Access IDs are useful editable player links, but neither is a safe long-lived database identity. Every map therefore owns an immutable UUID; Project Data Space uses that Map UUID and Group Data Space uses the main map's UUID. Existing project metadata receives a UUID once, while editable imports receive new UUIDs and published versions preserve their source UUIDs so changing an Access ID or releasing a new version never disconnects saved game data.
