import express, { Express, Request, Response, } from "express";

// import { initializeUniversityAgent, createNewInvitation, setupConnectionListener, registerSchema, createCredentialDefinition, issueCredentials, DemoAgent } from "./universityAgent";
// import { initializeBobAgent, receiveInvitation } from "./bobAgent";
import { cleanupAgent } from "./src/common";
import { University } from "./src/universityAgent";
import { Employer } from "./src/employerAgent";

const app: Express = express();

app.use(express.json());
const port = 8006;

const run = async () => {
    
    console.log("============Starting Application ====================")
    const {university, employer} = await startAgents();

    app.listen(port, () => {
        console.log(`Server listning on port ${port}`);
    });

    app.get("/", (req: Request, res: Response) => {
        console.log("Recieved request");
        res.status(200).send("Hello From server");
    });

    /*================================ University Endpoints ==========================================*/
  

    app.get("/university/createInvitation", async (req: Request, res: Response) => {
        console.log("Creating new Invitation");
       
        const newInvitation = await university.getConnectionInvite()
        console.log('Listening for connection changes...');
        university.setupConnectionListener(newInvitation.outOfBand, () =>
            console.log('We now have an active connection to use in the following tutorials')
        );

        res.status(200).send(newInvitation);
    });

    app.get("/university/connections", async (req: Request, res: Response) => {
        const allConnections = await university.getAllConnectionRecord();
        res.status(200).send(allConnections);
    });

    // app.get("/acme/reset", (req:Request, res:Response) => {
    //     cleanupAgent(acmeAgent);
    //     res.status(200).send(`Cleanup Completed`);
    // });

    app.post("/university/schema", async (req:Request, res:Response) => {
        const response = await university.registerSchema();
        res.status(200).send(response);
    });

    app.post("/university/credDef", async (req:Request, res:Response) => {
        const schemaId = req.body.schemaId;

        if (!schemaId || schemaId == "") {
            res.status(400).send("Invalid schema ID");
            return;
        }

        const response = await university.registerCredentialDefinition(schemaId);
        res.status(200).send(response);
    });

    app.post("/university/cred", async (req:Request, res:Response) => {
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
    });

    app.get("/university/reset", async (req: Request, res: Response) => {
        console.log("university - Creating new Invitation");
       
        await university.reset();
        res.status(200).send("university - Reset Successful"); 
    });
    /*================================ Bob Endpoints ==========================================*/

    app.get("/employer/createInvitation", async (req: Request, res: Response) => {
        console.log("employer - Creating new Invitation");
       
        const newInvitation = await employer.getConnectionInvite()
        console.log('employer - Listening for connection changes...');
        employer.setupConnectionListener(newInvitation.outOfBand, () =>
            console.log('employer - We now have an active connection to use in the following tutorials')
        );

        res.status(200).send(newInvitation); 
    });

    app.get("/employer/connections", async (req: Request, res: Response) => {
        const allConnections = await employer.getAllConnectionRecord();
        res.status(200).send(allConnections);
    });

    app.post("/employer/proof", async (req: Request, res: Response) => {
        console.log("employer - Creating new Invitation");
       
        const connectionId = req.body.connectionId;
        const credDefId = req.body.credDefId;
        const response = await employer.sendProofRequest(connectionId, credDefId);
        res.status(200).send(response); 
    });

    app.get("/employer/reset", async (req: Request, res: Response) => {
        console.log("employer - Creating new Invitation");
       
        await employer.reset();
        res.status(200).send("employer Reset Successful"); 
    });

    // app.get("/bob/initialize", async (req: Request, res: Response) => {
    //     console.log("Initialising Bob Agent manually");
    //     if (bobAgent.isInitialized) {
    //         console.log("Bob Agent already initialised");
            
    //         res.status(200).send(`Bob Agent already initialised`);
    //         return;
    //     }

    //     bobAgent = await initializeBobAgent();
    //     const isInitialized = bobAgent.isInitialized;
    //     console.log(`bob Agent isInitialized: ${isInitialized}`);
    //     res.status(200).send(`Bob Agent Initialisation status: ${isInitialized}`);
    // });

    // app.post("/bob/recieveInvite", async (req: Request, res: Response) => {
    //     console.log("Recieving Invite");
    //     if (!bobAgent.isInitialized) {
    //         console.log("Bob Agent is not initialised yet");
            
    //         res.status(200).send(`Bob Agent is not initialised yet, Plz initialise first`);
    //         return;
    //     }

    //     const invitationUrl = req.body.invitationUrl;

    //     const response = await receiveInvitation(bobAgent, invitationUrl)
    //     res.status(200).send(response);
    // });

    // app.get("/bob/connections", async (req: Request, res: Response) => {
    //     if (!bobAgent.isInitialized) {
    //         console.log("bob Agent is not initialised yet");
            
    //         res.status(200).send(`bob Agent is not initialised yet, Plz initialise first`);
    //         return;
    //     }

    //     const allConnections = await bobAgent.connections.getAll();
    //     res.status(200).send(allConnections);
    // });

    // app.get("/bob/reset", (req:Request, res:Response) => {
    //     cleanupAgent(bobAgent);
    //     res.status(200).send(`Cleanup Completed`);
    // });
    
};

const startAgents = async () => {
    const university = await University.build();
    await university.importDid();

    const employer = await Employer.build();
    await employer.importDid();

    return { university, employer };
};

run();