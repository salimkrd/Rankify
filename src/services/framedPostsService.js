import { createResultService } from "./resultsServiceFactory.js";

const service = createResultService("framed_posts");

export const listFramedPostsByEvent = service.listResultsByEvent;
export const getFramedPostById = service.getResultById;
export const createFramedPost = service.createResult;
export const updateFramedPost = service.updateResult;
export const deleteFramedPost = service.deleteResult;
