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
exports.Holder = exports.Output = void 0;
const core_1 = require("@credo-ts/core");
const BaseAgent_1 = require("./BaseAgent");
const ngrok_1 = require("ngrok");
var Output;
(function (Output) {
    Output["NoConnectionRecordFromOutOfBand"] = "\nNo connectionRecord has been created from invitation\n";
    Output["ConnectionEstablished"] = "\nConnection established!";
    Output["MissingConnectionRecord"] = "\nNo connectionRecord ID has been set yet\n";
    Output["ConnectionLink"] = "\nRun 'Receive connection invitation' in Alice and paste this invitation link:\n\n";
    Output["Exit"] = "Shutting down agent...\nExiting...";
})(Output || (exports.Output = Output = {}));
class Holder extends BaseAgent_1.BaseAgent {
    constructor(port, name, endpoint) {
        const connectionImageUrl = "https://atelierlks.com/wp-content/uploads/2020/10/99gen_arc.png";
        super({ port, name, endpoint, connectionImageUrl });
    }
    static build() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Building Holder Agent`);
            const port = 4005;
            const endpoint = yield (0, ngrok_1.connect)({ addr: port, authtoken_from_env: true });
            console.log(`NgROK Endpoint: ${endpoint}`);
            const holderAgent = new Holder(port, 'Holder', endpoint);
            yield holderAgent.initializeAgent();
            console.log(`Successfully Initialised Holder Agent`);
            return holderAgent;
        });
    }
    // Get All connection
    getAllConnectionRecord() {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this.agent.connections.getAll();
            return connection;
        });
    }
    //Accept connection request
    acceptConnection(invitationUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const { connectionRecord } = yield this.agent.oob.receiveInvitationFromUrl(invitationUrl);
            if (!connectionRecord) {
                throw new Error(Output.NoConnectionRecordFromOutOfBand);
            }
            return connectionRecord;
        });
    }
    ;
    //Get All Credentials
    getAllCredentials() {
        return __awaiter(this, void 0, void 0, function* () {
            const credentials = yield this.agent.credentials.getAll();
            return credentials;
        });
    }
    acceptCredentialOffer(credentialRecord) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.agent.credentials.acceptOffer({
                credentialRecordId: credentialRecord.id,
            });
        });
    }
    ;
    acceptProofRequest(proofRecord) {
        return __awaiter(this, void 0, void 0, function* () {
            const requestedCredentials = yield this.agent.proofs.selectCredentialsForRequest({
                proofRecordId: proofRecord.id,
            });
            yield this.agent.proofs.acceptRequest({
                proofRecordId: proofRecord.id,
                proofFormats: requestedCredentials.proofFormats,
            });
            console.log('\nProof request accepted!\n');
        });
    }
    sendMessage(connectionId, message) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.agent.basicMessages.sendMessage(connectionId, message);
        });
    }
    //CallBack to listen the connection status
    setupConnectionListener(outOfBandRecord, cb) {
        return __awaiter(this, void 0, void 0, function* () {
            this.agent.events.on(core_1.ConnectionEventTypes.ConnectionStateChanged, ({ payload }) => {
                if (payload.connectionRecord.outOfBandId !== outOfBandRecord.id)
                    return;
                if (payload.connectionRecord.state === core_1.DidExchangeState.Completed) {
                    // the connection is now ready for usage in other protocols!
                    console.log(`Connection for out-of-band id ${outOfBandRecord.id} completed`);
                    // Custom business logic can be included here
                    // In this example we can send a basic message to the connection, but
                    // anything is possible
                    cb();
                    // We exit the flow
                    // process.exit(0)
                }
            });
        });
    }
    ;
    //Get All Proofs from storage
    getAllProofs() {
        return __awaiter(this, void 0, void 0, function* () {
            const allProofs = yield this.agent.proofs.getAll();
            return allProofs;
        });
    }
    restart() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.agent.shutdown();
        });
    }
    //Reset Agent - It will clean the agent storage by deleting the all previous connections, credentials and proofs
    reset() {
        return __awaiter(this, void 0, void 0, function* () {
            const connections = yield this.agent.connections.getAll();
            for (const connection of connections) {
                yield this.agent.connections.deleteById(connection.id);
            }
            const credentials = yield this.agent.credentials.getAll();
            for (const credential of credentials) {
                yield this.agent.credentials.deleteById(credential.id);
            }
            const proofs = yield this.agent.proofs.getAll();
            for (const proof of proofs) {
                yield this.agent.proofs.deleteById(proof.id);
            }
        });
    }
}
exports.Holder = Holder;
