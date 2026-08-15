import * as jose from 'jose';

export class FirebaseRest {
  constructor(serviceAccountJson, projectId) {
    this.sa = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
    this.projectId = projectId;
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;
    const alg = 'RS256';
    const privateKey = await jose.importPKCS8(this.sa.private_key, alg);
    
    const jwt = await new jose.SignJWT({
      iss: this.sa.client_email,
      sub: this.sa.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore'
    })
      .setProtectedHeader({ alg, typ: 'JWT' })
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .sign(privateKey);

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
    });
    
    const data = await res.json();
    if (!data.access_token) {
      throw new Error('Failed to obtain Google access token: ' + JSON.stringify(data));
    }
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + ((data.expires_in - 60) * 1000);
    return this.accessToken;
  }

  // --- Auth APIs ---
  async getUserByEmail(email) {
    const token = await this.getAccessToken();
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${this.projectId}/accounts:lookup`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: [email] })
    });
    const data = await res.json();
    if (data.users && data.users.length > 0) return data.users[0];
    return null;
  }

  async getUserById(uid) {
    const token = await this.getAccessToken();
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${this.projectId}/accounts:lookup`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId: [uid] })
    });
    const data = await res.json();
    if (data.users && data.users.length > 0) return data.users[0];
    return null;
  }

  async createUser({ email, password, emailVerified }) {
    const token = await this.getAccessToken();
    // Use identity toolkit sign up
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${this.projectId}/accounts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    
    // Set emailVerified
    if (emailVerified) {
      await this.updateUser(data.localId, { emailVerified: true });
    }
    return { uid: data.localId, email: data.email };
  }

  async setCustomUserClaims(uid, claims) {
    const token = await this.getAccessToken();
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${this.projectId}/accounts:update`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify(claims) })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
  }

  async updateUser(uid, payload) {
    const token = await this.getAccessToken();
    const body = { localId: uid, ...payload };
    if (payload.disabled !== undefined) body.disableUser = payload.disabled;
    
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${this.projectId}/accounts:update`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
  }

  async listUsers(maxResults = 100, nextPageToken = undefined) {
    const token = await this.getAccessToken();
    const body = { maxResults };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${this.projectId}/accounts:batchGet`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data;
  }

  // --- Firestore APIs ---
  async getDocument(collection, docId) {
    const token = await this.getAccessToken();
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/${collection}/${docId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 404) return null;
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return this._parseFirestoreDocument(data);
  }

  async setDocument(collection, docId, fields) {
    const token = await this.getAccessToken();
    const document = this._toFirestoreDocument(fields);
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/${collection}/${docId}?updateMask.fieldPaths=` + Object.keys(fields).join('&updateMask.fieldPaths='), {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: document })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data;
  }

  async addDocument(collection, fields) {
    const token = await this.getAccessToken();
    const document = this._toFirestoreDocument(fields);
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/${collection}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: document })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data;
  }

  async deleteDocument(collection, docId) {
    const token = await this.getAccessToken();
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/${collection}/${docId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error?.message || 'Delete failed');
    }
  }
  
  async runQuery(collection, filters = []) {
     const token = await this.getAccessToken();
     // Simplify for our specific use cases: count docs etc.
     // To count, we can use the aggregate query REST API
     const res = await fetch(`https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents:runAggregationQuery`, {
       method: 'POST',
       headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
       body: JSON.stringify({
         structuredAggregationQuery: {
           structuredQuery: {
             from: [{ collectionId: collection }],
             where: filters.length ? {
               compositeFilter: {
                 op: 'AND',
                 filters: filters
               }
             } : undefined
           },
           aggregations: [{ count: {} }]
         }
       })
     });
     const data = await res.json();
     if (data[0] && data[0].result && data[0].result.aggregateFields) {
       return parseInt(data[0].result.aggregateFields.count_1?.integerValue || data[0].result.aggregateFields.count?.integerValue || "0", 10);
     }
     return 0;
  }

  _parseFirestoreDocument(doc) {
    if (!doc || !doc.fields) return {};
    const result = {};
    for (const [key, val] of Object.entries(doc.fields)) {
      if (val.stringValue !== undefined) result[key] = val.stringValue;
      else if (val.integerValue !== undefined) result[key] = parseInt(val.integerValue, 10);
      else if (val.doubleValue !== undefined) result[key] = val.doubleValue;
      else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
      else if (val.timestampValue !== undefined) result[key] = val.timestampValue;
      else if (val.mapValue !== undefined) result[key] = this._parseFirestoreDocument(val.mapValue);
      // simplify array, etc as needed
    }
    return result;
  }

  _toFirestoreDocument(obj) {
    const fields = {};
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'string') fields[key] = { stringValue: val };
      else if (typeof val === 'number') fields[key] = Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
      else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
      else if (val === 'REQUEST_TIME') fields[key] = { timestampValue: new Date().toISOString() }; // Mock server timestamp
      else if (val && typeof val === 'object' && val.isTimestamp) fields[key] = { timestampValue: val.value }; 
    }
    return fields;
  }
}
