import type { ProjectDataV10 } from '../schema-v10';
import { ProjectDataV11, ProjectDataV11Schema } from '../schema-v11';

export const migrateV10 = (data: ProjectDataV10): ProjectDataV11 => {
  const project = ProjectDataV11Schema.clone(ProjectDataV11Schema.identity);
  const { version, ...fields } = data;
  Object.assign(project, fields);
  return project;
};
