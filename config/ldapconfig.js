import ldap from 'ldapjs';
import dotenv from 'dotenv';

dotenv.config();

const client = ldap.createClient({
    url: process.env.LDAP_URL,
    reconnect: true,
});

client.on('connect', () => {
    console.log('LDAP client connected successfully.');
});

client.on('error', (err) => {
    console.error('LDAP connection error:', err);
});

client.on('disconnect', () => {
    console.warn('LDAP client disconnected.');
});

client.bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD, (err) => {
    if (err) {
        console.error('LDAP bind failed:', err);
    } else {
        console.log('LDAP bind successful.');
    }
});

export default client;
