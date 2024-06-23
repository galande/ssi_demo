import express, { Express, Request, Response, response, } from "express";

// import { initializeUniversityAgent, createNewInvitation, setupConnectionListener, registerSchema, createCredentialDefinition, issueCredentials, DemoAgent } from "./universityAgent";
// import { initializeBobAgent, receiveInvitation } from "./bobAgent";
import { cleanupAgent } from "./common";
import { University } from "./universityAgent";
import { Employer } from "./employerAgent";
import { Holder } from "./HolderAgent";

const app: Express = express();

app.use(express.json());
const port = 8006;

const run = async () => {

    console.log("============Starting Application ====================")
    const { university, employer, holder } = await startAgents();

    app.listen(port, () => {
        console.log(`Server listning on port ${port}`);
    });

    app.get("/", (req: Request, res: Response) => {
        console.log("Recieved request");
        res.status(200).send("Hello From server");
    });

    /*================================ University Endpoints ==========================================*/
    app.get("/university/createInvitation", async (req: Request, res: Response) => {
        try {
            console.log("Creating new Invitation");

            const newInvitation = await university.getConnectionInvite()
            console.log('Listening for connection changes...');
            university.setupConnectionListener(newInvitation.outOfBand, () =>
                console.log('We now have an active connection to use in the following tutorials')
            );

            res.status(200).send(newInvitation);
        } catch (error: any) {
            res.status(500).send("Error Occured");
        }

    });

    app.get("/university/connections", async (req: Request, res: Response) => {
        try {
            const allConnections = await university.getAllConnectionRecord();
            res.status(200).send(allConnections);
        } catch (error: any) {
            res.status(500).send("Error Occured");
        }

    });

    app.post("/university/schema", async (req: Request, res: Response) => {
        try {
            const response = await university.registerSchema();
            res.status(200).send(response);
        } catch (error: any) {
            res.status(500).send("Error Occured");
        }

    });

    app.post("/university/credDef", async (req: Request, res: Response) => {
        try {
            const schemaId = req.body.schemaId;

            if (!schemaId || schemaId == "") {
                res.status(400).send("Invalid schema ID");
                return;
            }

            const response = await university.registerCredentialDefinition(schemaId);
            res.status(200).send(response);
        } catch (error: any) {
            res.status(500).send("Error Occured");
        }

    });

    app.post("/university/cred", async (req: Request, res: Response) => {
        try {
            const connectionId = req.body.connectionId;

            if (!connectionId || connectionId == "") {
                res.status(400).send("Invalid connectionId");
                return;
            }

            const response = await university.issueCredential(
                connectionId,
                req.body.credDefId,
                req.body.registration_number,
                req.body.first_name,
                req.body.last_name,
                req.body.degree,
                req.body.status,
                req.body.year,
                req.body.average,
            );

            university.setupCredentialListener(connectionId, (connectionId) => console.log(`Credential accepted by ${connectionId}`))

            res.status(200).send(response);
        } catch (error: any) {
            res.status(500).send("Error Occured");
        }

    });

    app.get("/university/reset", async (req: Request, res: Response) => {
        try {
            console.log("university - Creating new Invitation");

            await university.reset();
            res.status(200).send("university - Reset Successful");
        } catch (error: any) {
            res.status(500).send("Error Occured");
        }

    });
    /*================================ Bob Endpoints ==========================================*/

    app.get("/employer/createInvitation", async (req: Request, res: Response) => {
        try {
            console.log("employer - Creating new Invitation");

            const newInvitation = await employer.getConnectionInvite()
            console.log('employer - Listening for connection changes...');
            employer.setupConnectionListener(newInvitation.outOfBand, () =>
                console.log('employer - We now have an active connection to use in the following tutorials')
            );

            res.status(200).send(newInvitation);
        } catch (error: any) {
            res.status(500).send("Error Occured");
        }

    });

    app.get("/employer/connections", async (req: Request, res: Response) => {
        try {
            const allConnections = await employer.getAllConnectionRecord();
            res.status(200).send(allConnections);
        } catch (error: any) {
            res.status(500).send("Error Occured");
        }

    });

    app.post("/employer/proof", async (req: Request, res: Response) => {
        try {
            console.log("employer - Creating new Proof request");

            const connectionId = req.body.connectionId;
            const credDefId = req.body.credDefId;
            const response = await employer.sendProofRequest(connectionId, credDefId);
            employer.setupProofListener(connectionId, () => { console.log("=========Proof State Channged ========") })
            res.status(200).send(response);
        } catch (error: any) {
            res.status(500).send("Error Occured");
        }

    });

    app.get("/employer/proofs", async (req: Request, res: Response) => {
        try {
            console.log("employer - Creating new Proof request");

            const response = await employer.getAllProofs();
            res.status(200).send(response);
        } catch (error: any) {
            res.status(500).send("Error Occured");
        }

    });

    app.post("/employer/schema", async (req: Request, res: Response) => {
        try {
            console.log("employer - Creating new Invite Schema");

            const response = await employer.registerInterviewInviteSchema();
            res.status(200).send(response);
        } catch (error: any) {
            res.status(500).send("Error Occured");
        }

    });

    app.post("/employer/credDef", async (req: Request, res: Response) => {
        try {
            console.log("employer - Creating new credential definition for Invite");
            const schemaId = req.body.schemaId;
            const response = await employer.registerCredentialDefinition(schemaId);
            res.status(200).send(response);
        } catch (error: any) {
            res.status(500).send("Error Occured");
        }
    });

    app.post("/employer/employment/schema", async (req: Request, res: Response) => {
        try {
            console.log("employer - Creating new Employment Schema");

            const response = await employer.registerEmploymentSchema();
            res.status(200).send(response);
        } catch (error: any) {
            res.status(500).send("Error Occured");
        }

    });

    app.post("/employer/employment/credDef", async (req: Request, res: Response) => {
        try {
            console.log("employer - Creating new credential definition for Invite");
            const schemaId = req.body.schemaId;
            const response = await employer.registerCredentialDefinitionOfEmployment(schemaId);
            res.status(200).send(response);
        } catch (error: any) {
            res.status(500).send("Error Occured");
        }
    });

    app.post("/employer/employment/issueCred", async (req: Request, res: Response) => {
        try {
            console.log("employer - Issuing cred offer of employment");
            const connectionId = req.body.connectionId;
            const credDefId = req.body.credDefId;
            const first_name = req.body.first_name;
            const last_name = req.body.last_name;
            const designation = req.body.designation;
            const start_date = req.body.start_date;

            const response = await employer.issueEmploymentCredential(connectionId, credDefId, first_name, last_name, designation, start_date);
            res.status(200).send(response);
        } catch (error: any) {
            res.status(500).send("Error Occured");
        }
    });

    app.get("/employer/reset", async (req: Request, res: Response) => {
        try {
            console.log("employer - Creating new Invitation");

            await employer.reset();
            res.status(200).send("employer Reset Successful");
        } catch (error: any) {
            res.status(500).send("Error Occured");
        }
    });

    /*===========================================Holder Endpoints==============================================*/
    app.get("/holder/connection", async (req: Request, res: Response) => {
        try {
            const connecitons = await holder.getAllConnectionRecord();
            return res.status(200).send(connecitons);
        } catch (error: any) {
            console.log(error.message);
            return res.status(500).send("Something went wrong");
        }
    });

    //Get All Connections
    app.post("/holder/connection", async (req: Request, res: Response) => {
        try {
            const invitationUrl = req.body.invitationUrl;
            const conneciton = await holder.acceptConnection(invitationUrl);
            return res.status(200).send(conneciton);
        } catch (error: any) {
            console.log(error.message);
            return res.status(500).send("Something went wrong");
        }
    });

    //Get All credentials
    app.get("/holder/credentials", async (req: Request, res: Response) => {
        try {
            const credentials = await holder.getAllCredentials();
            return res.status(200).send(credentials);
        } catch (error: any) {
            console.log(error.message);
            return res.status(500).send("Something went wrong");
        }
    });

    //Accept Credentials
    app.post("/holder/credentials", async (req: Request, res: Response) => {
        try {
            const credentialExchangeRecord = req.body.credentialExchangeRecord;
            const approvedCredentials = await holder.acceptCredentialOffer(credentialExchangeRecord);
            return res.status(200).send(approvedCredentials);
        } catch (error: any) {
            console.log(error.message);
            return res.status(500).send("Something went wrong");
        }
    });

    //Get All Proofs
    app.get("/holder/proof", async (req: Request, res: Response) => {
        try {
            const allProofs = await holder.getAllProofs();
            return res.status(200).send(allProofs);
        } catch (error: any) {
            console.log(error.message);
            return res.status(500).send("Something went wrong");
        }
    });

    //Accept proof request
    app.post("/holder/proof", async (req: Request, res: Response) => {
        try {
            const proofExchangeRecord = req.body.proofExchangeRecord;
            const approvedProof = await holder.acceptProofRequest(proofExchangeRecord);
            return res.status(200).send(approvedProof);
        } catch (error: any) {
            console.log(error.message);
            return res.status(500).send("Something went wrong");
        }
    });

    //Accept proof request
    app.get("/holder/reset", async (req: Request, res: Response) => {
        try {
            await holder.reset();
            return res.status(200).send("Holder - Reset successful.");
        } catch (error: any) {
            console.log(error.message);
            return res.status(500).send("Something went wrong");
        }
    });
};

const startAgents = async () => {
    const university = await University.build();
    await university.importDid();

    const employer = await Employer.build();
    await employer.importDid();

    const holder = await Holder.build();

    return { university, employer, holder };
};

run();