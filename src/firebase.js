import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged as fbOnAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  query, 
  orderBy,
  where,
  setDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getBlob, 
  deleteObject 
} from 'firebase/storage';

// Verifica se as variáveis de ambiente do Firebase foram preenchidas
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const isFirebaseConfigured = apiKey && apiKey.trim() !== "" && !apiKey.includes("YOUR_API_KEY");

export const isMockMode = import.meta.env.DEV && !isFirebaseConfigured;

// Wrapper de Logging Seguro (Desativado em Produção)
export const logger = {
  log: (...args) => {
    if (import.meta.env.DEV) console.log(...args);
  },
  error: (...args) => {
    if (import.meta.env.DEV) console.error(...args);
  },
  warn: (...args) => {
    if (import.meta.env.DEV) console.warn(...args);
  }
};

// --- CONFIGURAÇÃO REAL DO FIREBASE ---
let app, auth, db, storage;

if (isFirebaseConfigured) {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
  
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  // Define limite de novas tentativas de upload para 1 minuto em caso de falha de rede/CORS
  storage.maxUploadRetryTime = 60000;
}

// --- BANCO DE DADOS LOCAL (MOCK) ---
let MOCK_USERS = {};
let INITIAL_MOCK_CONTRACTS;
const mockFileBlobs = {};

if (import.meta.env.DEV) {
  MOCK_USERS = {
    "admin@contractus.com": {
      uid: "mock-admin-uid",
      email: "admin@contractus.com",
      name: "Administrador do Caixa",
      role: "admin"
    },
    "user@contractus.com": {
      uid: "mock-user-uid",
      email: "user@contractus.com",
      name: "Usuário Consulta",
      role: "user"
    },
    "fulano@contractus.com": {
      uid: "mock-fulano-uid",
      email: "fulano@contractus.com",
      name: "Fulano",
      role: "user"
    },
    "deltrano@contractus.com": {
      uid: "mock-deltrano-uid",
      email: "deltrano@contractus.com",
      name: "Deltrano",
      role: "user"
    }
  };

  INITIAL_MOCK_CONTRACTS = [
    {
      id: "mock-contract-1",
      fileName: "Contrato_FashionDay_BH.docx",
      fileSize: "1.2 MB",
      fileUrl: "mock-url-1",
      cityCreated: "São Paulo - SP",
      cityFashionDay: "Belo Horizonte - MG",
      payment: 12500.00,
      commissionBox: "Caixa Fulano",
      uploadedBy: "mock-admin-uid",
      assignedTo: "mock-fulano-uid",
      uploadedAt: new Date(Date.now() - 3600000 * 24).toISOString() // 1 dia atrás
    },
    {
      id: "mock-contract-2",
      fileName: "Contrato_FashionDay_RJ.docx",
      fileSize: "950 KB",
      fileUrl: "mock-url-2",
      cityCreated: "Niterói - RJ",
      cityFashionDay: "Rio de Janeiro - RJ",
      payment: 8400.00,
      commissionBox: "Caixa Deltrano",
      uploadedBy: "mock-admin-uid",
      assignedTo: "mock-deltrano-uid",
      uploadedAt: new Date(Date.now() - 3600000 * 48).toISOString() // 2 dias atrás
    }
  ];

  const initializeMockAuditLogs = (force = false) => {
    if (force || !localStorage.getItem("mock_audit_logs")) {
      const initialLogs = [
        {
          id: "mock-log-1",
          action: "CONTRACT_UPLOAD",
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
          userId: "mock-admin-uid",
          userName: "Administrador do Caixa",
          userEmail: "admin@contractus.com",
          details: {
            contractId: "mock-contract-1",
            fileName: "Contrato_FashionDay_BH.docx",
            fileSize: "1.2 MB",
            payment: 12500.00,
            commissionBox: "Caixa Fulano"
          }
        },
        {
          id: "mock-log-2",
          action: "CONTRACT_UPLOAD",
          timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
          userId: "mock-admin-uid",
          userName: "Administrador do Caixa",
          userEmail: "admin@contractus.com",
          details: {
            contractId: "mock-contract-2",
            fileName: "Contrato_FashionDay_RJ.docx",
            fileSize: "950 KB",
            payment: 8400.00,
            commissionBox: "Caixa Deltrano"
          }
        },
        {
          id: "mock-log-3",
          action: "LOGIN",
          timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
          userId: "mock-user-uid",
          userName: "Usuário Consulta",
          userEmail: "user@contractus.com",
          details: {}
        },
        {
          id: "mock-log-4",
          action: "CONTRACT_VIEW_TOGGLE",
          timestamp: new Date(Date.now() - 3600000 * 11.5).toISOString(),
          userId: "mock-user-uid",
          userName: "Usuário Consulta",
          userEmail: "user@contractus.com",
          details: {
            contractId: "mock-contract-1",
            fileName: "Contrato_FashionDay_BH.docx",
            status: "viewed"
          }
        },
        {
          id: "mock-log-5",
          action: "CONTRACT_DOWNLOAD",
          timestamp: new Date(Date.now() - 3600000 * 11).toISOString(),
          userId: "mock-user-uid",
          userName: "Usuário Consulta",
          userEmail: "user@contractus.com",
          details: {
            contractId: "mock-contract-1",
            fileName: "Contrato_FashionDay_BH.docx"
          }
        }
      ];
      localStorage.setItem("mock_audit_logs", JSON.stringify(initialLogs));
    }
  };

  // Carregar contratos iniciais do localStorage se não houver nada
  if (isMockMode && !localStorage.getItem("mock_contracts")) {
    localStorage.setItem("mock_contracts", JSON.stringify(INITIAL_MOCK_CONTRACTS));
  }
  
  if (isMockMode) {
    initializeMockAuditLogs();
  }
}

// --- EXPORTAÇÃO DA API UNIFICADA ---
let authStateListeners = [];

// 1. Autenticação: Fazer Login
export const login = async (email, password) => {
  if (isMockMode) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = MOCK_USERS[email.toLowerCase().trim()];
        // Senha padrão para teste: admin123 para admin, user123 para usuário comum, etc.
        let isCorrectPassword = false;
        if (import.meta.env.DEV) {
          isCorrectPassword = 
            (email.toLowerCase().trim() === "admin@contractus.com" && password === "admin123") ||
            (email.toLowerCase().trim() === "user@contractus.com" && password === "user123") ||
            (email.toLowerCase().trim() === "fulano@contractus.com" && password === "fulano123") ||
            (email.toLowerCase().trim() === "deltrano@contractus.com" && password === "deltrano123");
        }

        if (user && isCorrectPassword) {
          const key = `viewed_contracts_${user.uid}`;
          user.viewedContracts = JSON.parse(localStorage.getItem(key) || "[]");
          sessionStorage.setItem("mock_session", JSON.stringify(user));
          authStateListeners.forEach(cb => cb(user));
          resolve(user);
        } else {
          reject(new Error("E-mail ou senha incorretos. Verifique suas credenciais."));
        }
      }, 800);
    });
  } else {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      
      // Buscar perfil do usuário para saber a role
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        return {
          uid: fbUser.uid,
          email: fbUser.email,
          ...userDoc.data()
        };
      } else {
        // Caso não exista o documento, assume padrão 'user' para evitar bloqueios
        return {
          uid: fbUser.uid,
          email: fbUser.email,
          name: fbUser.email.split('@')[0],
          role: 'user'
        };
      }
    } catch (error) {
      logger.error("Erro no login:", error);
      throw new Error("E-mail ou senha incorretos. Verifique suas credenciais.", { cause: error });
    }
  }
};

// 2. Autenticação: Fazer Logout
export const logout = async () => {
  if (isMockMode) {
    sessionStorage.removeItem("mock_session");
    authStateListeners.forEach(cb => cb(null));
    return Promise.resolve();
  } else {
    return signOut(auth);
  }
};

// 3. Autenticação: Ouvinte de Estado
export const onAuthStateChanged = (callback) => {
  if (isMockMode) {
    authStateListeners.push(callback);
    
    // Initial check
    const session = sessionStorage.getItem("mock_session");
    if (session) {
      const user = JSON.parse(session);
      const key = `viewed_contracts_${user.uid}`;
      user.viewedContracts = JSON.parse(localStorage.getItem(key) || "[]");
      callback(user);
    } else {
      callback(null);
    }
    
    return () => {
      authStateListeners = authStateListeners.filter(cb => cb !== callback);
    };
  } else {
    return fbOnAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          let userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            // Inicializa o perfil do usuário no Firestore se ele não existir
            const initialProfile = {
              name: fbUser.displayName || fbUser.email.split('@')[0],
              email: fbUser.email,
              role: 'user',
              viewedContracts: []
            };
            await setDoc(userDocRef, initialProfile, { merge: true });
            userDoc = await getDoc(userDocRef);
          }
          const data = userDoc.data();
          callback({
            uid: fbUser.uid,
            email: fbUser.email,
            viewedContracts: data.viewedContracts || [],
            ...data
          });
        } catch (e) {
          logger.error("Erro ao obter dados do usuário:", e);
          callback({
            uid: fbUser.uid,
            email: fbUser.email,
            name: fbUser.email.split('@')[0],
            role: 'user'
          });
        }
      } else {
        callback(null);
      }
    });
  }
};

// 4. Contratos: Listar
export const getContracts = async (user) => {
  if (!user) return [];

  if (isMockMode) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = JSON.parse(localStorage.getItem("mock_contracts") || "[]");
        
        // Se for admin, vê tudo
        if (user.role === 'admin') {
          list.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
          resolve(list);
          return;
        }

        // Se for user comum, filtra no mock pelo campo assignedTo
        const filtered = list.filter(contract => {
          const uploadedByMe = contract.uploadedBy === user.uid;
          const assignedToMe = contract.assignedTo === user.uid;
          return uploadedByMe || assignedToMe;
        });

        filtered.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        resolve(filtered);
      }, 500);
    });
  } else {
    const contractsCol = collection(db, 'contracts');
    
    if (user.role === 'admin') {
      const q = query(contractsCol, orderBy('uploadedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } else {
      // Busca apenas contratos atribuídos a este usuário no Firebase
      const q = query(
        contractsCol,
        where('assignedTo', '==', user.uid),
        orderBy('uploadedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  }
};

// 4.5. Usuários: Buscar todos (para atribuição de contratos)
export const getUsers = async () => {
  if (isMockMode) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = Object.values(MOCK_USERS);
        resolve(list);
      }, 300);
    });
  } else {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  }
};

// 5. Contratos: Upload
export const uploadContract = async (file, metadata, onProgress) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // --- VALIDAÇÕES DE SEGURANÇA ---
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];

  if (!file) {
    throw new Error('Nenhum arquivo foi fornecido.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Tamanho do arquivo excede o limite permitido de 25 MB.');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Formato de arquivo não permitido. Apenas arquivos PDF e Word (.docx, .doc) são aceitos.');
  }
  // ---------------------------------

  if (isMockMode) {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        if (onProgress) onProgress(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          
          // Criar uma URL de objeto local para permitir download real durante a sessão
          const objectUrl = URL.createObjectURL(file);
          const contractId = "mock-" + Math.random().toString(36).substring(2, 9);
          
          // Guardar o blob em memória para downloads subsequentes
          mockFileBlobs[contractId] = file;
          
          const newContract = {
            id: contractId,
            fileName: file.name,
            fileSize: formatFileSize(file.size),
            fileUrl: objectUrl,
            cityCreated: metadata.cityCreated,
            cityFashionDay: metadata.cityFashionDay,
            payment: parseFloat(metadata.payment) || 0,
            commissionBox: metadata.commissionBox,
            uploadedBy: metadata.uploadedBy || "mock-admin-uid",
            assignedTo: metadata.assignedTo,
            uploadedAt: new Date().toISOString()
          };
          
          const list = JSON.parse(localStorage.getItem("mock_contracts") || "[]");
          list.push(newContract);
          localStorage.setItem("mock_contracts", JSON.stringify(list));
          
          resolve(newContract);
        }
      }, 200);
    });
  } else {
    // Realizar upload do arquivo no Storage usando o ID do destinatário na estrutura de pastas
    const fileId = Math.random().toString(36).substring(2, 11) + "_" + file.name;
    const storagePath = `contracts/${metadata.assignedTo}/${fileId}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        }, 
        (error) => {
          reject(error);
        }, 
        async () => {
          try {
            // Gravar metadados no Firestore (Sem persistir a fileUrl pública permanente)
            const newDoc = {
              fileName: file.name,
              fileSize: formatFileSize(file.size),
              storagePath: storagePath,
              cityCreated: metadata.cityCreated,
              cityFashionDay: metadata.cityFashionDay,
              payment: parseFloat(metadata.payment) || 0,
              commissionBox: metadata.commissionBox,
              uploadedBy: metadata.uploadedBy,
              assignedTo: metadata.assignedTo,
              uploadedAt: new Date().toISOString()
            };
            
            const docRef = await addDoc(collection(db, 'contracts'), newDoc);
            resolve({
              id: docRef.id,
              ...newDoc
            });
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  }
};

// 6. Contratos: Excluir
export const deleteContract = async (contract, user) => {
  if (!user || user.role !== 'admin') {
    throw new Error("Ação não autorizada. Apenas administradores podem excluir contratos.");
  }

  if (isMockMode) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = JSON.parse(localStorage.getItem("mock_contracts") || "[]");
        const filteredList = list.filter(item => item.id !== contract.id);
        localStorage.setItem("mock_contracts", JSON.stringify(filteredList));
        
        // Limpar blob da memória se existir
        if (mockFileBlobs[contract.id]) {
          delete mockFileBlobs[contract.id];
        }
        resolve();
      }, 500);
    });
  } else {
    // Excluir documento do Firestore
    await deleteDoc(doc(db, 'contracts', contract.id));
    
    // Excluir arquivo do Storage
    if (contract.storagePath) {
      const fileRef = ref(storage, contract.storagePath);
      await deleteObject(fileRef);
    }
  }
};

// Função auxiliar para baixar arquivo mock ou real (tornada assíncrona)
export const downloadContractFile = async (contract) => {
  if (isMockMode) {
    const file = mockFileBlobs[contract.id];
    let downloadUrl = contract.fileUrl;
    
    // Se o ObjectURL expirou ou não está em memória (ex: após refresh), criar um Blob mock de texto
    if (!file && (!contract.fileUrl || contract.fileUrl.startsWith("mock-url"))) {
      const dummyContent = `Este e um arquivo simulado para o contrato: ${contract.fileName}\n` +
                           `Cidade de Origem: ${contract.cityCreated}\n` +
                           `Cidade do Fashion Day: ${contract.cityFashionDay}\n` +
                           `Valor do Pagamento: R$ ${contract.payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                           `Caixa de Comissao: ${contract.commissionBox}\n`;
      const blob = new Blob([dummyContent], { type: 'text/plain' });
      downloadUrl = URL.createObjectURL(blob);
    }
    
    const a = document.createElement("a");
    a.href = downloadUrl;
    // Forçar extensão .docx ou txt para download do mock
    a.download = file ? contract.fileName : contract.fileName.replace(/\.docx$/, "") + ".txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Se criamos um link blob temporário agora, revogar depois de um tempo
    if (!file) {
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
    }
  } else {
    // No Firebase real, baixamos o arquivo como Blob usando o token de autenticação
    if (!contract.storagePath) {
      throw new Error("Erro no download: Caminho do arquivo não localizado no servidor.");
    }
    const fileRef = ref(storage, contract.storagePath);
    const blob = await getBlob(fileRef);
    const downloadUrl = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = contract.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Revoga o link blob temporário logo após o download
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
  }
};

// 7. Contratos: Alternar estado de visualização
export const toggleContractViewed = async (user, contractId, currentStatus) => {
  if (!user) return [];

  if (isMockMode) {
    const key = `viewed_contracts_${user.uid}`;
    let viewed = JSON.parse(localStorage.getItem(key) || "[]");
    if (currentStatus) {
      viewed = viewed.filter(id => id !== contractId);
    } else {
      if (!viewed.includes(contractId)) {
        viewed.push(contractId);
      }
    }
    localStorage.setItem(key, JSON.stringify(viewed));
    
    // Atualizar a sessão se estiver ativa
    const session = sessionStorage.getItem("mock_session");
    if (session) {
      const parsedSession = JSON.parse(session);
      if (parsedSession.uid === user.uid) {
        parsedSession.viewedContracts = viewed;
        sessionStorage.setItem("mock_session", JSON.stringify(parsedSession));
      }
    }
    
    return viewed;
  } else {
    const userDocRef = doc(db, 'users', user.uid);
    const updateData = {};
    if (currentStatus) {
      updateData.viewedContracts = arrayRemove(contractId);
    } else {
      updateData.viewedContracts = arrayUnion(contractId);
    }
    await setDoc(userDocRef, updateData, { merge: true });
    
    const updatedDoc = await getDoc(userDocRef);
    return updatedDoc.data()?.viewedContracts || [];
  }
};

// 8. Logs de Auditoria: Adicionar Evento
export const addAuditLog = async (user, action, details = {}) => {
  if (!user) return null;

  const logEntry = {
    action,
    details,
    timestamp: new Date().toISOString(),
    userId: user.uid,
    userName: user.name || user.email.split('@')[0],
    userEmail: user.email
  };

  if (isMockMode) {
    const logs = JSON.parse(localStorage.getItem("mock_audit_logs") || "[]");
    logEntry.id = "mock-log-" + Math.random().toString(36).substring(2, 9);
    logs.push(logEntry);
    localStorage.setItem("mock_audit_logs", JSON.stringify(logs));
    logger.log("Audit log mock adicionado:", logEntry);
    return logEntry;
  } else {
    try {
      const docRef = await addDoc(collection(db, 'audit_logs'), logEntry);
      logger.log("Audit log Firebase adicionado com ID:", docRef.id);
      return { id: docRef.id, ...logEntry };
    } catch (e) {
      logger.error("Erro ao adicionar audit log no Firebase:", e);
      throw e;
    }
  }
};

// 9. Logs de Auditoria: Buscar todos
export const getAuditLogs = async () => {
  if (isMockMode) {
    const logs = JSON.parse(localStorage.getItem("mock_audit_logs") || "[]");
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return logs;
  } else {
    try {
      const auditCol = collection(db, 'audit_logs');
      const q = query(auditCol, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (e) {
      logger.error("Erro ao buscar audit logs no Firebase:", e);
      throw e;
    }
  }
};

// 10. Logs de Auditoria: Limpar logs locais (Apenas Modo Mock)
export const clearMockAuditLogs = async () => {
  if (isMockMode) {
    localStorage.removeItem("mock_audit_logs");
    // Chamamos a função de inicialização interna para gerar logs padrão novamente
    const initialLogs = [
      {
        id: "mock-log-1",
        action: "CONTRACT_UPLOAD",
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        userId: "mock-admin-uid",
        userName: "Administrador do Caixa",
        userEmail: "admin@contractus.com",
        details: {
          contractId: "mock-contract-1",
          fileName: "Contrato_FashionDay_BH.docx",
          fileSize: "1.2 MB",
          payment: 12500.00,
          commissionBox: "Caixa Fulano"
        }
      },
      {
        id: "mock-log-2",
        action: "CONTRACT_UPLOAD",
        timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
        userId: "mock-admin-uid",
        userName: "Administrador do Caixa",
        userEmail: "admin@contractus.com",
        details: {
          contractId: "mock-contract-2",
          fileName: "Contrato_FashionDay_RJ.docx",
          fileSize: "950 KB",
          payment: 8400.00,
          commissionBox: "Caixa Deltrano"
        }
      }
    ];
    localStorage.setItem("mock_audit_logs", JSON.stringify(initialLogs));
  }
};

