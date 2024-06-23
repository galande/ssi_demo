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
exports.Employer = exports.Output = void 0;
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
const seed = `empl12issuerdidseed0000000000000`; // What you input on bcovrin. Should be kept secure in production!
const unqualifiedIndyDid = `RYwJSsXhmwgvT1hivFda9S`; // will be returned after registering seed on bcovrin
const universityDid = `did:indy:bcovrin:test:${unqualifiedIndyDid}`;
// const INTERVIEW_INVITE_CRED_DEF_ID = "did:indy:bcovrin:test:RYwJSsXhmwgvT1hivFda9S/anoncreds/v0/CLAIM_DEF/895907/latest";
const INTERVIEW_INVITE_CRED_DEF_ID = "did:indy:bcovrin:test:RYwJSsXhmwgvT1hivFda9S/anoncreds/v0/CLAIM_DEF/895907/Interview_Invite_Card";
class Employer extends BaseAgent_1.BaseAgent {
    constructor(port, name, endpoint) {
        const connectionImageUrl = "https://atelierlks.com/wp-content/uploads/2020/10/99gen_arc.png";
        super({ port, name, endpoint, connectionImageUrl });
    }
    static build() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Building Employer Agent`);
            const port = 4001;
            const endpoint = yield (0, ngrok_1.connect)({ addr: port, authtoken_from_env: true });
            console.log(`NgROK Endpoint: ${endpoint}`);
            const universityAgent = new Employer(port, 'BG Employer', endpoint);
            yield universityAgent.initializeAgent();
            console.log(`Successfully Initialised Employer Agent`);
            return universityAgent;
        });
    }
    // importDID - Registered with Indy ledger
    importDid() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Employer - Importing DID');
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
    // Get All connection
    getAllConnectionRecord() {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this.agent.connections.getAll();
            return connection;
        });
    }
    //Crete new conneciton Invie
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
    //CallBack to listen the credential status
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
    //CallBack to listen the proof request status
    setupProofListener(connectionId, cb) {
        return __awaiter(this, void 0, void 0, function* () {
            this.agent.events.on(core_1.ProofEventTypes.ProofStateChanged, (_a) => __awaiter(this, [_a], void 0, function* ({ payload }) {
                var _b, _c, _d;
                console.log(payload);
                cb();
                if (payload.proofRecord.state == core_1.ProofState.PresentationReceived) {
                    console.log(`==============Proof Received-Validating It===================`);
                    yield this.agent.proofs.acceptPresentation({ proofRecordId: payload.proofRecord.id });
                    const proofData = yield this.agent.proofs.getFormatData(payload.proofRecord.id);
                    const receivedProof = (_d = (_c = (_b = proofData.presentation) === null || _b === void 0 ? void 0 : _b.anoncreds) === null || _c === void 0 ? void 0 : _c.requested_proof.revealed_attr_groups) === null || _d === void 0 ? void 0 : _d.name.values;
                    const degree = receivedProof === null || receivedProof === void 0 ? void 0 : receivedProof.degree.raw;
                    const average = (receivedProof === null || receivedProof === void 0 ? void 0 : receivedProof.average.raw) || "";
                    const connectionId = payload.proofRecord.connectionId || "";
                    console.log(`======Connection Id: ${connectionId}`);
                    const connection = yield this.agent.connections.getById(connectionId);
                    //Job requirement is "Bachelor Of Engineering" degree and atleast 65% average marks
                    if (degree != "Bachelor Of Engineering" || +average < 65) {
                        this.agent.basicMessages.sendMessage(connection.id, `Sorry, You do not meet the required criteria for this job. Job requirement is "Bachelor Of Engineering" degree and atleast 65% average marks`);
                    }
                    else {
                        this.agent.basicMessages.sendMessage(connection.id, "Congratulations, You have meet the required criteria for this job. We have shared invite with you.");
                        yield this.sendInterviewInvite(connectionId);
                    }
                }
            }));
        });
    }
    ;
    //Send Interview Invite VC
    sendInterviewInvite(connectionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const credentialRecord = yield this.agent.credentials.offerCredential({
                connectionId: connectionId,
                protocolVersion: 'v2',
                credentialFormats: {
                    anoncreds: {
                        credentialDefinitionId: INTERVIEW_INVITE_CRED_DEF_ID,
                        attributes: [
                            { name: 'invite_date', value: "01 July 2024" },
                            { name: 'invited_by', value: "HR XYZ" },
                            { name: 'job_id', value: "JOB980877" },
                        ]
                    },
                },
            });
        });
    }
    //Get All Proofs from storage
    getAllProofs() {
        return __awaiter(this, void 0, void 0, function* () {
            const allProofs = this.agent.proofs.getAll();
            return allProofs;
        });
    }
    // Register Interview Invite Schema to ledger
    registerInterviewInviteSchema() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.anonCredsIssuerId) {
                throw new Error('Missing anoncreds issuerId');
            }
            const schemaTemplate = {
                name: 'BG_Employer_Invite',
                version: '1.0.0',
                attrNames: ['invite_date', 'invited_by', 'job_id'],
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
    //Register Credential definition to ledger
    registerCredentialDefinition(schemaId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.anonCredsIssuerId) {
                throw new Error('Missing anoncreds issuerId');
            }
            const { credentialDefinitionState } = yield this.agent.modules.anoncreds.registerCredentialDefinition({
                credentialDefinition: {
                    schemaId,
                    issuerId: this.anonCredsIssuerId,
                    tag: 'Interview_Invite_Card',
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
    // Register Employment Schema to ledger
    registerEmploymentSchema() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.anonCredsIssuerId) {
                throw new Error('Missing anoncreds issuerId');
            }
            const schemaTemplate = {
                name: 'BG_Employer_Employment',
                version: '1.0.0',
                attrNames: ['first_name', 'last_name', 'designation', 'start_date'],
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
    //Register Credential definition of Employment schema
    registerCredentialDefinitionOfEmployment(schemaId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.anonCredsIssuerId) {
                throw new Error('Missing anoncreds issuerId');
            }
            const { credentialDefinitionState } = yield this.agent.modules.anoncreds.registerCredentialDefinition({
                credentialDefinition: {
                    schemaId,
                    issuerId: this.anonCredsIssuerId,
                    tag: 'Employment_Card',
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
    // Issue Employment credential to connection
    issueEmploymentCredential(connectionId, credDefId, first_name, last_name, designation, start_date) {
        return __awaiter(this, void 0, void 0, function* () {
            const credentialRecord = yield this.agent.credentials.offerCredential({
                connectionId: connectionId,
                protocolVersion: 'v2',
                credentialFormats: {
                    anoncreds: {
                        credentialDefinitionId: credDefId,
                        attributes: [
                            { name: 'first_name', value: first_name },
                            { name: 'last_name', value: last_name },
                            { name: 'designation', value: designation },
                            { name: 'start_date', value: start_date },
                        ],
                    },
                },
            });
            console.log(`\nCredential offer sent!\n\nGo to the agent to accept the credential offer`);
            return credentialRecord;
        });
    }
    //Create proof attribute template
    newProofAttribute1(credentialDefinitionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const proofAttribute = {
                name: {
                    names: ['degree', 'average'],
                    restrictions: [
                        {
                            cred_def_id: credentialDefinitionId,
                        },
                    ],
                },
            };
            return proofAttribute;
        });
    }
    //Send proof request to connection
    sendProofRequest(connectionId, credentialDefinitionId) {
        return __awaiter(this, void 0, void 0, function* () {
            // const connectionRecord = await this.getConnectionRecord()
            const proofAttribute = yield this.newProofAttribute1(credentialDefinitionId);
            const proofRequest = yield this.agent.proofs.requestProof({
                protocolVersion: 'v2',
                connectionId: connectionId,
                proofFormats: {
                    anoncreds: {
                        name: 'degree_proof-request',
                        version: '1.0',
                        requested_attributes: proofAttribute,
                    },
                },
            });
            return proofRequest;
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
exports.Employer = Employer;
