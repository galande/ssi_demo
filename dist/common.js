"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupAgent = void 0;
const cleanupAgent = (agent) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Starting cleanup');
    //Remove All Connections
    const connections = yield agent.connections.getAll();
    for (const connection of connections) {
        yield agent.connections.deleteById(connection.id);
    }
    //Remove All Credentials
    const credentials = yield agent.credentials.getAll();
    for (const credential of credentials) {
        yield agent.credentials.deleteById(credential.id);
    }
    //Remove All Proofs
    const proofs = yield agent.proofs.getAll();
    for (const proof of proofs) {
        yield agent.proofs.deleteById(proof.id);
    }
    console.log('Cleanup completed');
});
exports.cleanupAgent = cleanupAgent;
