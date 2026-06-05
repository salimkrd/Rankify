import { createTemplateService } from "./templatesServiceFactory.js";

const service = createTemplateService("program_templates");

export const listProgramTemplatesByEvent = service.listTemplatesByEvent;
export const getProgramTemplateById = service.getTemplateById;
export const createProgramTemplate = service.createTemplate;
export const updateProgramTemplate = service.updateTemplate;
export const deleteProgramTemplate = service.deleteTemplate;
export const duplicateProgramTemplate = service.duplicateTemplate;
