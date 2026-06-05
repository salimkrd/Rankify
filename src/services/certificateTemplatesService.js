import { createTemplateService } from "./templatesServiceFactory.js";

const service = createTemplateService("certificate_templates");

export const listCertificateTemplatesByEvent = service.listTemplatesByEvent;
export const getCertificateTemplateById = service.getTemplateById;
export const createCertificateTemplate = service.createTemplate;
export const updateCertificateTemplate = service.updateTemplate;
export const deleteCertificateTemplate = service.deleteTemplate;
export const duplicateCertificateTemplate = service.duplicateTemplate;
