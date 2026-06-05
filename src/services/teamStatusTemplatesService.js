import { createTemplateService } from "./templatesServiceFactory.js";

const service = createTemplateService("team_status_templates");

export const listTeamStatusTemplatesByEvent = service.listTemplatesByEvent;
export const getTeamStatusTemplateById = service.getTemplateById;
export const createTeamStatusTemplate = service.createTemplate;
export const updateTeamStatusTemplate = service.updateTemplate;
export const deleteTeamStatusTemplate = service.deleteTemplate;
export const duplicateTeamStatusTemplate = service.duplicateTemplate;
