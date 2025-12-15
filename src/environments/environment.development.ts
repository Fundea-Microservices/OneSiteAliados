//const API_URL = 'http://localhost:3030/'
const API_URL = 'http://172.25.5.11:3300/'

export const environment = {
    production: false,
    path: API_URL,
    apiPath: (API_URL) + 'api',
    tokenCheckInterval: 5, // minutos
    diasAtrasMovimientos: 1,
};