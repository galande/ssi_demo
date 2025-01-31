
import { Agent, ConnectionEventTypes, ConnectionRecord, ConnectionStateChangedEvent, ConnectionsModule, CredentialEventTypes, CredentialStateChangedEvent, CredentialsModule, DidExchangeState, DidsModule, HttpOutboundTransport, InitConfig, KeyType, OutOfBandRecord, ProofEventTypes, ProofState, ProofStateChangedEvent, TypedArrayEncoder, V2CredentialProtocol, WsOutboundTransport, utils } from "@credo-ts/core"


import { BaseAgent } from "./BaseAgent"
import { RegisterCredentialDefinitionReturnStateFinished } from "@credo-ts/anoncreds"
import { connect } from "ngrok"
import { IndyVdrRegisterCredentialDefinitionOptions, IndyVdrRegisterSchemaOptions } from "@credo-ts/indy-vdr"

export enum Output {
  NoConnectionRecordFromOutOfBand = `\nNo connectionRecord has been created from invitation\n`,
  ConnectionEstablished = `\nConnection established!`,
  MissingConnectionRecord = `\nNo connectionRecord ID has been set yet\n`,
  ConnectionLink = `\nRun 'Receive connection invitation' in Alice and paste this invitation link:\n\n`,
  Exit = 'Shutting down agent...\nExiting...',
}

const seed = `empl12issuerdidseed0000000000000` // What you input on bcovrin. Should be kept secure in production!
const unqualifiedIndyDid = `RYwJSsXhmwgvT1hivFda9S` // will be returned after registering seed on bcovrin
const universityDid = `did:indy:bcovrin:test:${unqualifiedIndyDid}`;
// const INTERVIEW_INVITE_CRED_DEF_ID = "did:indy:bcovrin:test:RYwJSsXhmwgvT1hivFda9S/anoncreds/v0/CLAIM_DEF/895907/latest";
const INTERVIEW_INVITE_CRED_DEF_ID = "did:indy:bcovrin:test:RYwJSsXhmwgvT1hivFda9S/anoncreds/v0/CLAIM_DEF/895907/Interview_Invite_Card";

export class Employer extends BaseAgent {
  public outOfBandId?: string
  public credentialDefinition?: RegisterCredentialDefinitionReturnStateFinished
  public anonCredsIssuerId?: string

  public constructor(port: number, name: string, endpoint: string) {
    const connectionImageUrl = "https://atelierlks.com/wp-content/uploads/2020/10/99gen_arc.png";
    super({ port, name, endpoint, connectionImageUrl })
  }

  public static async build(): Promise<Employer> {
    console.log(`Building Employer Agent`)
    const port: number = 4001;
    const endpoint = await connect({ addr: port, authtoken_from_env: true });
    console.log(`NgROK Endpoint: ${endpoint}`);
    const universityAgent = new Employer(port, 'BG Employer', endpoint)
    await universityAgent.initializeAgent();
    console.log(`Successfully Initialised Employer Agent`)
    return universityAgent
  }

  // importDID - Registered with Indy ledger
  public async importDid() {
    console.log('Employer - Importing DID')
    // NOTE: we assume the did is already registered on the ledger, we just store the private key in the wallet
    // and store the existing did in the wallet
    // indy did is based on private key (seed)
    await this.agent.dids.import({
      did: universityDid,
      overwrite: true,
      privateKeys: [
        {
          keyType: KeyType.Ed25519,
          privateKey: TypedArrayEncoder.fromString(seed),
        },
      ],
    })

    this.anonCredsIssuerId = universityDid
  }

  // Get All connection
  public async getAllConnectionRecord() {

    const connection = await this.agent.connections.getAll()

    return connection
  }

  //Crete new conneciton Invie
  public async getConnectionInvite() {
    const outOfBand = await this.agent.oob.createInvitation()
    this.outOfBandId = outOfBand.id
    return {
      invitationUrl: outOfBand.outOfBandInvitation.toUrl({ domain: this.endpoint }),
      outOfBand,
    }
  }

  //CallBack to listen the connection status
  public async setupConnectionListener(outOfBandRecord: OutOfBandRecord, cb: (...args: any) => void) {
    this.agent.events.on<ConnectionStateChangedEvent>(ConnectionEventTypes.ConnectionStateChanged, ({ payload }) => {
      if (payload.connectionRecord.outOfBandId !== outOfBandRecord.id) return
      if (payload.connectionRecord.state === DidExchangeState.Completed) {
        // the connection is now ready for usage in other protocols!
        console.log(`Connection for out-of-band id ${outOfBandRecord.id} completed`)

        // Custom business logic can be included here
        // In this example we can send a basic message to the connection, but
        // anything is possible
        cb()

        // We exit the flow
        // process.exit(0)
      }
    })

  };

  //CallBack to listen the credential status
  public async setupCredentialListener(connectionId: string, cb: (...args: any) => void) {
    console.log("Listning for credential state changes")
    this.agent.events.on<CredentialStateChangedEvent>(CredentialEventTypes.CredentialStateChanged, ({ payload }) => {
      // if (payload.credentialRecord.id !== connectionId) return
      // if (payload.credentialRecord.state === cre) {
      // the connection is now ready for usage in other protocols!
      console.log(`Credential call back`)
      console.log(payload.credentialRecord);

      // Custom business logic can be included here
      // In this example we can send a basic message to the connection, but
      // anything is possible
      cb()

      // We exit the flow
      // process.exit(0)
      // }
    })
  };

  //CallBack to listen the proof request status
  public async setupProofListener(connectionId: string, cb: (...args: any) => void) {
    this.agent.events.on<ProofStateChangedEvent>(ProofEventTypes.ProofStateChanged, async ({ payload }) => {
      console.log(payload)
      cb();
      if (payload.proofRecord.state == ProofState.PresentationReceived) {
        console.log(`==============Proof Received-Validating It===================`)
        await this.agent.proofs.acceptPresentation({ proofRecordId: payload.proofRecord.id });
        const proofData = await this.agent.proofs.getFormatData(payload.proofRecord.id);
        const receivedProof = proofData.presentation?.anoncreds?.requested_proof.revealed_attr_groups?.name.values
        const degree = receivedProof?.degree.raw;
        const average = receivedProof?.average.raw || "";
        const connectionId = payload.proofRecord.connectionId || "";
        console.log(`======Connection Id: ${connectionId}`);
        const connection = await this.agent.connections.getById(connectionId);
        //Job requirement is "Bachelor Of Engineering" degree and atleast 65% average marks
        if (degree != "Bachelor Of Engineering" || +average < 65) {
          this.agent.basicMessages.sendMessage(connection.id, `Sorry, You do not meet the required criteria for this job. Job requirement is "Bachelor Of Engineering" degree and atleast 65% average marks`);
        } else {
          this.agent.basicMessages.sendMessage(connection.id, "Congratulations, You have meet the required criteria for this job. We have shared invite with you.");
          await this.sendInterviewInvite(connectionId);
        }

      }
    })
  };

  //Send Interview Invite VC
  private async sendInterviewInvite(connectionId: string) {
    const credentialRecord = await this.agent.credentials.offerCredential({
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
    })
  }

  //Get All Proofs from storage
  public async getAllProofs() {
    const allProofs = this.agent.proofs.getAll();
    return allProofs;
  }

  // Register Interview Invite Schema to ledger
  public async registerInterviewInviteSchema() {
    if (!this.anonCredsIssuerId) {
      throw new Error('Missing anoncreds issuerId')
    }

    const schemaTemplate = {
      name: 'BG_Employer_Invite',
      version: '1.0.0',
      attrNames: ['invite_date', 'invited_by', 'job_id'],
      issuerId: this.anonCredsIssuerId,
    }


    const { schemaState } = await this.agent.modules.anoncreds.registerSchema<IndyVdrRegisterSchemaOptions>({
      schema: schemaTemplate,
      options: {
        endorserMode: 'internal',
        endorserDid: this.anonCredsIssuerId,
      },
    })

    if (schemaState.state !== 'finished') {
      throw new Error(
        `Error registering schema: ${schemaState.state === 'failed' ? schemaState.reason : 'Not Finished'}`
      )
    }

    return schemaState
  }

  //Register Credential definition to ledger
  public async registerCredentialDefinition(schemaId: string) {
    if (!this.anonCredsIssuerId) {
      throw new Error('Missing anoncreds issuerId')
    }

    const { credentialDefinitionState } =
      await this.agent.modules.anoncreds.registerCredentialDefinition<IndyVdrRegisterCredentialDefinitionOptions>({
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
      })

    if (credentialDefinitionState.state !== 'finished') {
      throw new Error(
        `Error registering credential definition: ${credentialDefinitionState.state === 'failed' ? credentialDefinitionState.reason : 'Not Finished'
        }}`
      )
    }

    this.credentialDefinition = credentialDefinitionState
    return this.credentialDefinition
  }

  // Register Employment Schema to ledger
  public async registerEmploymentSchema() {
    if (!this.anonCredsIssuerId) {
      throw new Error('Missing anoncreds issuerId')
    }

    const schemaTemplate = {
      name: 'BG_Employer_Employment',
      version: '1.0.0',
      attrNames: ['first_name', 'last_name', 'designation', 'start_date'],
      issuerId: this.anonCredsIssuerId,
    }


    const { schemaState } = await this.agent.modules.anoncreds.registerSchema<IndyVdrRegisterSchemaOptions>({
      schema: schemaTemplate,
      options: {
        endorserMode: 'internal',
        endorserDid: this.anonCredsIssuerId,
      },
    })

    if (schemaState.state !== 'finished') {
      throw new Error(
        `Error registering schema: ${schemaState.state === 'failed' ? schemaState.reason : 'Not Finished'}`
      )
    }

    return schemaState
  }

  //Register Credential definition of Employment schema
  public async registerCredentialDefinitionOfEmployment(schemaId: string) {
    if (!this.anonCredsIssuerId) {
      throw new Error('Missing anoncreds issuerId')
    }

    const { credentialDefinitionState } =
      await this.agent.modules.anoncreds.registerCredentialDefinition<IndyVdrRegisterCredentialDefinitionOptions>({
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
      })

    if (credentialDefinitionState.state !== 'finished') {
      throw new Error(
        `Error registering credential definition: ${credentialDefinitionState.state === 'failed' ? credentialDefinitionState.reason : 'Not Finished'
        }}`
      )
    }

    this.credentialDefinition = credentialDefinitionState
    return this.credentialDefinition
  }

  // Issue Employment credential to connection
  public async issueEmploymentCredential(connectionId: string,
    credDefId: string,
    first_name: string,
    last_name: string,
    designation: string,
    start_date: string) {

    const credentialRecord = await this.agent.credentials.offerCredential({
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
    })

    console.log(
      `\nCredential offer sent!\n\nGo to the agent to accept the credential offer`
    );

    return credentialRecord;
  }

  //Create proof attribute template
  private async newProofAttribute1(credentialDefinitionId: string) {
    const proofAttribute = {
      name: {
        names: ['degree', 'average'],
        restrictions: [
          {
            cred_def_id: credentialDefinitionId,
          },
        ],
      },
    }

    return proofAttribute
  }

  //Send proof request to connection
  public async sendProofRequest(connectionId: string, credentialDefinitionId: string) {
    // const connectionRecord = await this.getConnectionRecord()
    const proofAttribute = await this.newProofAttribute1(credentialDefinitionId)

    const proofRequest = await this.agent.proofs.requestProof({
      protocolVersion: 'v2',
      connectionId: connectionId,
      proofFormats: {
        anoncreds: {
          name: 'degree_proof-request',
          version: '1.0',
          requested_attributes: proofAttribute,
        },
      },
    })

    return proofRequest;
  }

  public async restart() {
    await this.agent.shutdown()
  }

  //Reset Agent - It will clean the agent storage by deleting the all previous connections, credentials and proofs
  public async reset() {
    const connections = await this.agent.connections.getAll();
    for (const connection of connections) {
      await this.agent.connections.deleteById(connection.id);
    }

    const credentials = await this.agent.credentials.getAll();
    for (const credential of credentials) {
      await this.agent.credentials.deleteById(credential.id);
    }

    const proofs = await this.agent.proofs.getAll();
    for (const proof of proofs) {
      await this.agent.proofs.deleteById(proof.id);
    }
  }
}

