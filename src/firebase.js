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
  where 
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
}

// --- BANCO DE DADOS LOCAL (MOCK) ---
let MOCK_USERS = {};
let INITIAL_MOCK_CONTRACTS = [];
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
      uploadedAt: new Date(Date.now() - 3600000 * 48).toISOString() // 2 dias atrás
    }
  ];

  // Carregar contratos iniciais do localStorage se não houver nada
  if (isMockMode && !localStorage.getItem("mock_contracts")) {
    localStorage.setItem("mock_contracts", JSON.stringify(INITIAL_MOCK_CONTRACTS));
  }
}

// --- EXPORTAÇÃO DA API UNIFICADA ---

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
          localStorage.setItem("mock_session", JSON.stringify(user));
          resolve(user);
        } else {
          reject(new Error("E-mail ou senha incorretos. Verifique suas credenciais."));
        }
      }, 800);
    });
  } else {
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
  }
};

// 2. Autenticação: Fazer Logout
export const logout = async () => {
  if (isMockMode) {
    localStorage.removeItem("mock_session");
    return Promise.resolve();
  } else {
    return signOut(auth);
  }
};

// 3. Autenticação: Ouvinte de Estado
export const onAuthStateChanged = (callback) => {
  if (isMockMode) {
    const checkAuth = () => {
      const session = localStorage.getItem("mock_session");
      if (session) {
        callback(JSON.parse(session));
      } else {
        callback(null);
      }
    };
    checkAuth();
    // Simula alteração escutando storage
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  } else {
    return fbOnAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            callback({
              uid: fbUser.uid,
              email: fbUser.email,
              ...userDoc.data()
            });
          } else {
            callback({
              uid: fbUser.uid,
              email: fbUser.email,
              name: fbUser.email.split('@')[0],
              role: 'user'
            });
          }
        } catch (e) {
          console.error("Erro ao obter dados do usuário:", e);
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

        // Se for user comum, filtra no mock
        const filtered = list.filter(contract => {
          const uploadedByMe = contract.uploadedBy === user.uid;
          const userNameLower = (user.name || '').toLowerCase();
          const userEmailPrefixLower = (user.email ? user.email.split('@')[0] : '').toLowerCase();
          const commissionBoxLower = (contract.commissionBox || '').toLowerCase();
          
          const matchesBox = commissionBoxLower && (
            (userNameLower && commissionBoxLower.includes(userNameLower)) ||
            (userEmailPrefixLower && commissionBoxLower.includes(userEmailPrefixLower))
          );
          return uploadedByMe || matchesBox;
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
      // Busca apenas contratos criados por este usuário no Firebase
      const q = query(
        contractsCol,
        where('uploadedBy', '==', user.uid),
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
    // Realizar upload do arquivo no Storage
    const fileId = Math.random().toString(36).substring(2, 11) + "_" + file.name;
    const storageRef = ref(storage, `contracts/${fileId}`);
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
              storagePath: `contracts/${fileId}`,
              cityCreated: metadata.cityCreated,
              cityFashionDay: metadata.cityFashionDay,
              payment: parseFloat(metadata.payment) || 0,
              commissionBox: metadata.commissionBox,
              uploadedBy: metadata.uploadedBy,
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
