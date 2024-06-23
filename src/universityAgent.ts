
import { Agent, ConnectionEventTypes, ConnectionRecord, ConnectionStateChangedEvent, ConnectionsModule, CredentialEventTypes, CredentialStateChangedEvent, CredentialsModule, DidExchangeState, DidsModule, HttpOutboundTransport, InitConfig, KeyType, OutOfBandRecord, TypedArrayEncoder, V2CredentialProtocol, WsOutboundTransport, utils } from "@credo-ts/core"


import { BaseAgent } from "./BaseAgent"
import { RegisterCredentialDefinitionReturnStateFinished } from "@credo-ts/anoncreds"
import { connect } from "ngrok"
import { IndyVdrRegisterCredentialDefinitionOptions, IndyVdrRegisterSchemaOptions } from "@credo-ts/indy-vdr"
import { uuid } from "@credo-ts/core/build/utils/uuid"

export enum Output {
  NoConnectionRecordFromOutOfBand = `\nNo connectionRecord has been created from invitation\n`,
  ConnectionEstablished = `\nConnection established!`,
  MissingConnectionRecord = `\nNo connectionRecord ID has been set yet\n`,
  ConnectionLink = `\nRun 'Receive connection invitation' in Alice and paste this invitation link:\n\n`,
  Exit = 'Shutting down agent...\nExiting...',
}

const seed = `bguniversityissuerdidseed0000001` // What you input on bcovrin. Should be kept secure in production!
const unqualifiedIndyDid = `5VMhy9wGv5MzWCGj6Uspeg` // will be returned after registering seed on bcovrin
const universityDid = `did:indy:bcovrin:test:${unqualifiedIndyDid}`

export class University extends BaseAgent {
  public outOfBandId?: string
  public credentialDefinition?: RegisterCredentialDefinitionReturnStateFinished
  public anonCredsIssuerId?: string

  public constructor(port: number, name: string, endpoint: string) {
    const connectionImageUrl = "https://img.freepik.com/premium-vector/campus-collage-university-education-logo-design-template_7492-59.jpg";
    super({ port, name, endpoint, connectionImageUrl })
  }

  public static async build(): Promise<University> {
    console.log(`Building Univeristy Agent`)
    const port: number = 3001;
    const endpoint = await connect({ addr: port, authtoken_from_env: true });
    // const endpoint = "https://super-hornet-dynamic.ngrok-free.app";
    console.log(`NgROK Endpoint: ${endpoint}`);
    const universityAgent = new University(port, 'BG University', endpoint)
    await universityAgent.initializeAgent();
    console.log(`Successfully Initialised Univeristy Agent`)
    return universityAgent
  }

  public async importDid() {
    console.log('University - Importing DID')
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

  public async getAllConnectionRecord() {
    const connection = await this.agent.connections.getAll()
    return connection
  }

  public async getConnectionInvite() {
    const outOfBand = await this.agent.oob.createInvitation()
    this.outOfBandId = outOfBand.id
    return {
      invitationUrl: outOfBand.outOfBandInvitation.toUrl({ domain: this.endpoint }),
      outOfBand,
    }
  }

  //Callback to call when connection established
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

  // Callback to execute when credentials status changes.
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

  // Register Schema of Degree Certificate
  public async registerSchema() {
    if (!this.anonCredsIssuerId) {
      throw new Error('Missing anoncreds issuerId')
    }

    const schemaTemplate = {
      name: 'AICTE_INDIA_DEGREE_SCHEMA_BG' + uuid(),
      version: '1.0.0',
      attrNames: ['registration_number', 'first_name', 'last_name', 'degree', 'status', 'year', 'average'],
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

  //Register credential definition for degree certificate
  public async registerCredentialDefinition(schemaId: string) {
    if (!this.anonCredsIssuerId) {
      throw new Error('Missing anoncreds issuerId')
    }

    const { credentialDefinitionState } =
      await this.agent.modules.anoncreds.registerCredentialDefinition<IndyVdrRegisterCredentialDefinitionOptions>({
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

  //Issue credentials to connection
  public async issueCredential(connectionId: string,
    credDefId: string,
    registration_number: string,
    first_name: string,
    last_name: string,
    degree: string,
    status: string,
    year: string,
    average: string) {

    const credentialRecord = await this.agent.credentials.offerCredential({
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
    })

    console.log(
      `\nCredential offer sent!\n\nGo to the Alice agent to accept the credential offer`
    );

    return credentialRecord;
  }

  //Restart the Agent
  public async restart() {
    await this.agent.shutdown()
  }

  //Reset the agent. It deletes the all previous connections, credentials and proofs
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
