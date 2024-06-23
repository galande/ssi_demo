
import { Agent, ConnectionEventTypes, ConnectionRecord, ConnectionStateChangedEvent, ConnectionsModule, CredentialEventTypes, CredentialExchangeRecord, CredentialStateChangedEvent, CredentialsModule, DidExchangeState, DidsModule, HttpOutboundTransport, InitConfig, KeyType, OutOfBandRecord, ProofEventTypes, ProofExchangeRecord, ProofState, ProofStateChangedEvent, TypedArrayEncoder, V2CredentialProtocol, WsOutboundTransport, utils } from "@credo-ts/core"


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

export class Holder extends BaseAgent {
  public outOfBandId?: string
  public credentialDefinition?: RegisterCredentialDefinitionReturnStateFinished
  public anonCredsIssuerId?: string

  public constructor(port: number, name: string, endpoint: string) {
    const connectionImageUrl = "https://atelierlks.com/wp-content/uploads/2020/10/99gen_arc.png";
    super({ port, name, endpoint, connectionImageUrl })
  }

  public static async build(): Promise<Holder> {
    console.log(`Building Holder Agent`)
    const port: number = 4005;
    const endpoint = await connect({ addr: port, authtoken_from_env: true });
    console.log(`NgROK Endpoint: ${endpoint}`);
    const holderAgent = new Holder(port, 'Holder', endpoint)
    await holderAgent.initializeAgent();
    console.log(`Successfully Initialised Holder Agent`)
    return holderAgent
  }

  // Get All connection
  public async getAllConnectionRecord() {
    const connection = await this.agent.connections.getAll()
    return connection;
  }

  //Accept connection request
  public async acceptConnection(invitationUrl: string) {
    const { connectionRecord } = await this.agent.oob.receiveInvitationFromUrl(invitationUrl)
    if (!connectionRecord) {
      throw new Error(Output.NoConnectionRecordFromOutOfBand)
    }
    return connectionRecord
  };

  //Get All Credentials
  public async getAllCredentials() {
    const credentials = await this.agent.credentials.getAll();
    return credentials;
  }

  public async acceptCredentialOffer(credentialRecord: CredentialExchangeRecord) {
    await this.agent.credentials.acceptOffer({
      credentialRecordId: credentialRecord.id,
    })
  };

  public async acceptProofRequest(proofRecord: ProofExchangeRecord) {
    const requestedCredentials = await this.agent.proofs.selectCredentialsForRequest({
      proofRecordId: proofRecord.id,
    })

    await this.agent.proofs.acceptRequest({
      proofRecordId: proofRecord.id,
      proofFormats: requestedCredentials.proofFormats,
    })
    console.log('\nProof request accepted!\n')
  }

  public async sendMessage(connectionId: string, message: string) {
    await this.agent.basicMessages.sendMessage(connectionId, message)
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

  //Get All Proofs from storage
  public async getAllProofs() {
    const allProofs = await this.agent.proofs.getAll();
    return allProofs;
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

