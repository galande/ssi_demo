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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const universityAgent_1 = require("./universityAgent");
const employerAgent_1 = require("./employerAgent");
const HolderAgent_1 = require("./HolderAgent");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const port = 8006;
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("============Starting Application ====================");
    const { university, employer, holder } = yield startAgents();
    app.listen(port, () => {
        console.log(`Server listning on port ${port}`);
    });
    app.get("/", (req, res) => {
        console.log("Recieved request");
        res.status(200).send("Hello From server");
    });
    /*================================ University Endpoints ==========================================*/
    app.get("/university/createInvitation", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("Creating new Invitation");
            const newInvitation = yield university.getConnectionInvite();
            console.log('Listening for connection changes...');
            university.setupConnectionListener(newInvitation.outOfBand, () => console.log('We now have an active connection to use in the following tutorials'));
            res.status(200).send(newInvitation);
        }
        catch (error) {
            res.status(500).send("Error Occured");
        }
    }));
    app.get("/university/connections", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const allConnections = yield university.getAllConnectionRecord();
            res.status(200).send(allConnections);
        }
        catch (error) {
            res.status(500).send("Error Occured");
        }
    }));
    app.post("/university/schema", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const response = yield university.registerSchema();
            res.status(200).send(response);
        }
        catch (error) {
            res.status(500).send("Error Occured");
        }
    }));
    app.post("/university/credDef", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const schemaId = req.body.schemaId;
            if (!schemaId || schemaId == "") {
                res.status(400).send("Invalid schema ID");
                return;
            }
            const response = yield university.registerCredentialDefinition(schemaId);
            res.status(200).send(response);
        }
        catch (error) {
            res.status(500).send("Error Occured");
        }
    }));
    app.post("/university/cred", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const connectionId = req.body.connectionId;
            if (!connectionId || connectionId == "") {
                res.status(400).send("Invalid connectionId");
                return;
            }
            const response = yield university.issueCredential(connectionId, req.body.credDefId, req.body.registration_number, req.body.first_name, req.body.last_name, req.body.degree, req.body.status, req.body.year, req.body.average);
            university.setupCredentialListener(connectionId, (connectionId) => console.log(`Credential accepted by ${connectionId}`));
            res.status(200).send(response);
        }
        catch (error) {
            res.status(500).send("Error Occured");
        }
    }));
    app.get("/university/reset", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("university - Creating new Invitation");
            yield university.reset();
            res.status(200).send("university - Reset Successful");
        }
        catch (error) {
            res.status(500).send("Error Occured");
        }
    }));
    /*================================ Bob Endpoints ==========================================*/
    app.get("/employer/createInvitation", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("employer - Creating new Invitation");
            const newInvitation = yield employer.getConnectionInvite();
            console.log('employer - Listening for connection changes...');
            employer.setupConnectionListener(newInvitation.outOfBand, () => console.log('employer - We now have an active connection to use in the following tutorials'));
            res.status(200).send(newInvitation);
        }
        catch (error) {
            res.status(500).send("Error Occured");
        }
    }));
    app.get("/employer/connections", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const allConnections = yield employer.getAllConnectionRecord();
            res.status(200).send(allConnections);
        }
        catch (error) {
            res.status(500).send("Error Occured");
        }
    }));
    app.post("/employer/proof", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("employer - Creating new Proof request");
            const connectionId = req.body.connectionId;
            const credDefId = req.body.credDefId;
            const response = yield employer.sendProofRequest(connectionId, credDefId);
            employer.setupProofListener(connectionId, () => { console.log("=========Proof State Channged ========"); });
            res.status(200).send(response);
        }
        catch (error) {
            res.status(500).send("Error Occured");
        }
    }));
    app.get("/employer/proofs", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("employer - Creating new Proof request");
            const response = yield employer.getAllProofs();
            res.status(200).send(response);
        }
        catch (error) {
            res.status(500).send("Error Occured");
        }
    }));
    app.post("/employer/schema", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("employer - Creating new Invite Schema");
            const response = yield employer.registerInterviewInviteSchema();
            res.status(200).send(response);
        }
        catch (error) {
            res.status(500).send("Error Occured");
        }
    }));
    app.post("/employer/credDef", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("employer - Creating new credential definition for Invite");
            const schemaId = req.body.schemaId;
            const response = yield employer.registerCredentialDefinition(schemaId);
            res.status(200).send(response);
        }
        catch (error) {
            res.status(500).send("Error Occured");
        }
    }));
    app.post("/employer/employment/schema", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("employer - Creating new Employment Schema");
            const response = yield employer.registerEmploymentSchema();
            res.status(200).send(response);
        }
        catch (error) {
            res.status(500).send("Error Occured");
        }
    }));
    app.post("/employer/employment/credDef", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("employer - Creating new credential definition for Invite");
            const schemaId = req.body.schemaId;
            const response = yield employer.registerCredentialDefinitionOfEmployment(schemaId);
            res.status(200).send(response);
        }
        catch (error) {
            res.status(500).send("Error Occured");
        }
    }));
    app.post("/employer/employment/issueCred", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("employer - Issuing cred offer of employment");
            const connectionId = req.body.connectionId;
            const credDefId = req.body.credDefId;
            const first_name = req.body.first_name;
            const last_name = req.body.last_name;
            const designation = req.body.designation;
            const start_date = req.body.start_date;
            const response = yield employer.issueEmploymentCredential(connectionId, credDefId, first_name, last_name, designation, start_date);
            res.status(200).send(response);
        }
        catch (error) {
            res.status(500).send("Error Occured");
        }
    }));
    app.get("/employer/reset", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("employer - Creating new Invitation");
            yield employer.reset();
            res.status(200).send("employer Reset Successful");
        }
        catch (error) {
            res.status(500).send("Error Occured");
        }
    }));
    /*===========================================Holder Endpoints==============================================*/
    app.get("/holder/connection", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const connecitons = yield holder.getAllConnectionRecord();
            return res.status(200).send(connecitons);
        }
        catch (error) {
            console.log(error.message);
            return res.status(500).send("Something went wrong");
        }
    }));
    //Get All Connections
    app.post("/holder/connection", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const invitationUrl = req.body.invitationUrl;
            const conneciton = yield holder.acceptConnection(invitationUrl);
            return res.status(200).send(conneciton);
        }
        catch (error) {
            console.log(error.message);
            return res.status(500).send("Something went wrong");
        }
    }));
    //Get All credentials
    app.get("/holder/credentials", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const credentials = yield holder.getAllCredentials();
            return res.status(200).send(credentials);
        }
        catch (error) {
            console.log(error.message);
            return res.status(500).send("Something went wrong");
        }
    }));
    //Accept Credentials
    app.post("/holder/credentials", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const credentialExchangeRecord = req.body.credentialExchangeRecord;
            const approvedCredentials = yield holder.acceptCredentialOffer(credentialExchangeRecord);
            return res.status(200).send(approvedCredentials);
        }
        catch (error) {
            console.log(error.message);
            return res.status(500).send("Something went wrong");
        }
    }));
    //Get All Proofs
    app.get("/holder/proof", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const allProofs = yield holder.getAllProofs();
            return res.status(200).send(allProofs);
        }
        catch (error) {
            console.log(error.message);
            return res.status(500).send("Something went wrong");
        }
    }));
    //Accept proof request
    app.post("/holder/proof", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const proofExchangeRecord = req.body.proofExchangeRecord;
            const approvedProof = yield holder.acceptProofRequest(proofExchangeRecord);
            return res.status(200).send(approvedProof);
        }
        catch (error) {
            console.log(error.message);
            return res.status(500).send("Something went wrong");
        }
    }));
    //Accept proof request
    app.get("/holder/reset", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield holder.reset();
            return res.status(200).send("Holder - Reset successful.");
        }
        catch (error) {
            console.log(error.message);
            return res.status(500).send("Something went wrong");
        }
    }));
});
const startAgents = () => __awaiter(void 0, void 0, void 0, function* () {
    const university = yield universityAgent_1.University.build();
    yield university.importDid();
    const employer = yield employerAgent_1.Employer.build();
    yield employer.importDid();
    const holder = yield HolderAgent_1.Holder.build();
    return { university, employer, holder };
});
run();
