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
exports.University = exports.Output = void 0;
const core_1 = require("@credo-ts/core");
const BaseAgent_1 = require("./BaseAgent");
const ngrok_1 = require("ngrok");
const uuid_1 = require("@credo-ts/core/build/utils/uuid");
var Output;
(function (Output) {
    Output["NoConnectionRecordFromOutOfBand"] = "\nNo connectionRecord has been created from invitation\n";
    Output["ConnectionEstablished"] = "\nConnection established!";
    Output["MissingConnectionRecord"] = "\nNo connectionRecord ID has been set yet\n";
    Output["ConnectionLink"] = "\nRun 'Receive connection invitation' in Alice and paste this invitation link:\n\n";
    Output["Exit"] = "Shutting down agent...\nExiting...";
})(Output || (exports.Output = Output = {}));
const seed = `bguniversityissuerdidseed0000001`; // What you input on bcovrin. Should be kept secure in production!
const unqualifiedIndyDid = `5VMhy9wGv5MzWCGj6Uspeg`; // will be returned after registering seed on bcovrin
const universityDid = `did:indy:bcovrin:test:${unqualifiedIndyDid}`;
class University extends BaseAgent_1.BaseAgent {
    constructor(port, name, endpoint) {
        const connectionImageUrl = "https://img.freepik.com/premium-vector/campus-collage-university-education-logo-design-template_7492-59.jpg";
        super({ port, name, endpoint, connectionImageUrl });
    }
    static build() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Building Univeristy Agent`);
            const port = 3001;
            const endpoint = yield (0, ngrok_1.connect)({ addr: port, authtoken_from_env: true });
            // const endpoint = "https://super-hornet-dynamic.ngrok-free.app";
            console.log(`NgROK Endpoint: ${endpoint}`);
            const universityAgent = new University(port, 'BG University', endpoint);
            yield universityAgent.initializeAgent();
            console.log(`Successfully Initialised Univeristy Agent`);
            return universityAgent;
        });
    }
    importDid() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('University - Importing DID');
            // NOTE: we assume the did is already registered on the ledger, we just store the private key in the wallet
            // and store the existing did in the wallet
            // indy did is based on private key (seed)
            yield this.agent.dids.import({
                did: universityDid,
                overwrite: true,
                privateKeys: [
                    {
                        keyType: core_1.KeyType.Ed25519,
                        privateKey: core_1.TypedArrayEncoder.fromString(seed),
                    },
                ],
            });
            this.anonCredsIssuerId = universityDid;
        });
    }
    getAllConnectionRecord() {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this.agent.connections.getAll();
            return connection;
        });
    }
    getConnectionInvite() {
        return __awaiter(this, void 0, void 0, function* () {
            const outOfBand = yield this.agent.oob.createInvitation();
            this.outOfBandId = outOfBand.id;
            return {
                invitationUrl: outOfBand.outOfBandInvitation.toUrl({ domain: this.endpoint }),
                outOfBand,
            };
        });
    }
    //Callback to call when connection established
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
    // Callback to execute when credentials status changes.
    setupCredentialListener(connectionId, cb) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Listning for credential state changes");
            this.agent.events.on(core_1.CredentialEventTypes.CredentialStateChanged, ({ payload }) => {
                // if (payload.credentialRecord.id !== connectionId) return
                // if (payload.credentialRecord.state === cre) {
                // the connection is now ready for usage in other protocols!
                console.log(`Credential call back`);
                console.log(payload.credentialRecord);
                // Custom business logic can be included here
                // In this example we can send a basic message to the connection, but
                // anything is possible
                cb();
                // We exit the flow
                // process.exit(0)
                // }
            });
        });
    }
    ;
    // Register Schema of Degree Certificate
    registerSchema() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.anonCredsIssuerId) {
                throw new Error('Missing anoncreds issuerId');
            }
            const schemaTemplate = {
                name: 'AICTE_INDIA_DEGREE_SCHEMA_BG' + (0, uuid_1.uuid)(),
                version: '1.0.0',
                attrNames: ['registration_number', 'first_name', 'last_name', 'degree', 'status', 'year', 'average'],
                issuerId: this.anonCredsIssuerId,
            };
            const { schemaState } = yield this.agent.modules.anoncreds.registerSchema({
                schema: schemaTemplate,
                options: {
                    endorserMode: 'internal',
                    endorserDid: this.anonCredsIssuerId,
                },
            });
            if (schemaState.state !== 'finished') {
                throw new Error(`Error registering schema: ${schemaState.state === 'failed' ? schemaState.reason : 'Not Finished'}`);
            }
            return schemaState;
        });
    }
    //Register credential definition for degree certificate
    registerCredentialDefinition(schemaId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.anonCredsIssuerId) {
                throw new Error('Missing anoncreds issuerId');
            }
            const { credentialDefinitionState } = yield this.agent.modules.anoncreds.registerCredentialDefinition({
                credentialDefinition: {
                    schemaId,
                    issuerId: this.anonCredsIssuerId,
                    // tag: 'latest',
                    tag: 'Degree_Certificate',
                },
                options: {
                    supportRevocation: false,
                    endorserMode: 'internal',
                    endorserDid: this.anonCredsIssuerId,
                },
            });
            if (credentialDefinitionState.state !== 'finished') {
                throw new Error(`Error registering credential definition: ${credentialDefinitionState.state === 'failed' ? credentialDefinitionState.reason : 'Not Finished'}}`);
            }
            this.credentialDefinition = credentialDefinitionState;
            return this.credentialDefinition;
        });
    }
    //Issue credentials to connection
    issueCredential(connectionId, credDefId, registration_number, first_name, last_name, degree, status, year, average) {
        return __awaiter(this, void 0, void 0, function* () {
            const credentialRecord = yield this.agent.credentials.offerCredential({
                connectionId: connectionId,
                protocolVersion: 'v2',
                credentialFormats: {
                    anoncreds: {
                        credentialDefinitionId: credDefId,
                        attributes: [
                            { name: 'registration_number', value: registration_number },
                            { name: 'first_name', value: first_name },
                            { name: 'last_name', value: last_name },
                            { name: 'degree', value: degree },
                            { name: 'status', value: status },
                            { name: 'year', value: year },
                            { name: 'average', value: average },
                        ],
                    },
                },
            });
            console.log(`\nCredential offer sent!\n\nGo to the Alice agent to accept the credential offer`);
            return credentialRecord;
        });
    }
    //Restart the Agent
    restart() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.agent.shutdown();
        });
    }
    //Reset the agent. It deletes the all previous connections, credentials and proofs
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
exports.University = University;
