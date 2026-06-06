import { createResultService } from "./resultsServiceFactory.js";

const service = createResultService("certificate_results");

export const listCertificateResultsByEvent = service.listResultsByEvent;
export const getCertificateResultById = service.getResultById;
export const createCertificateResult = service.createResult;
export const updateCertificateResult = service.updateResult;
export const deleteCertificateResult = service.deleteResult;
