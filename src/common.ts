
import { Agent } from '@credo-ts/core';

export const cleanupAgent = async (agent: Agent) => {
    console.log('Starting cleanup');
    //Remove All Connections
    const connections = await agent.connections.getAll();
    for (const connection of connections) {
        await agent.connections.deleteById(connection.id)
    }
    
    //Remove All Credentials
    const credentials = await agent.credentials.getAll();
    for (const credential of credentials) {
        await agent.credentials.deleteById(credential.id);
    }

    //Remove All Proofs
    const proofs = await agent.proofs.getAll();
    for (const proof of proofs) {
        await agent.proofs.deleteById(proof.id);
    }
    
    console.log('Cleanup completed');
};