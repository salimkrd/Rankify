import { createTemplateService } from "./templatesServiceFactory.js";

const service = createTemplateService("framed_post_templates");

export const listFramedPostTemplatesByEvent = service.listTemplatesByEvent;
export const getFramedPostTemplateById = service.getTemplateById;
export const createFramedPostTemplate = service.createTemplate;
export const updateFramedPostTemplate = service.updateTemplate;
export const deleteFramedPostTemplate = service.deleteTemplate;
export const duplicateFramedPostTemplate = service.duplicateTemplate;
