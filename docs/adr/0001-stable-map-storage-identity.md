# Use an immutable permanent map ID for storage identity

Local directory keys are useful implementation locators and Access IDs are useful editable player links, but neither is a safe long-lived database identity. Every map therefore owns an immutable 20-character lowercase hexadecimal ID generated from 80 random bits. Project Data Space uses that permanent map ID and Group Data Space uses the main map's permanent ID. Editable imports receive new IDs, while published versions preserve their source IDs so changing an Access ID or releasing a new version never disconnects saved game data.
