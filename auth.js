import{auth,db}from"./firebase.js";import{createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,sendPasswordResetEmail,sendEmailVerification,GoogleAuthProvider,signInWithPopup,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";import{doc,setDoc,getDoc,serverTimestamp}from"https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
export async function ensureUserProfile(user,extraData={}){if(!user||!user.uid)return null;const userRef=doc(db,"users",user.uid);const profileData={email:user.email||"",displayName:user.displayName||extraData.displayName||"",photoURL:user.photoURL||"",lastLoginAt:serverTimestamp(),...extraData};try{await setDoc(userRef,profileData,{merge:true});return profileData;}catch(error){console.error("Firestore user profile save failed:",error);return null;}}
export async function getUserProfile(uid){if(!uid)return null;try{const snap=await getDoc(doc(db,"users",uid));if(snap.exists()){return snap.data();}}catch(error){console.error("Error loading user profile:",error);}return null;}
export async function redirectBasedOnRole(user) {
    if (!user) return;
    try {
        const idTokenResult = await user.getIdTokenResult();
        if (idTokenResult.claims.admin === true) {
            window.location.replace("mode.html");
        } else {
            window.location.replace("dashboard.html");
        }
    } catch (e) {
        console.error("Failed to check admin claim", e);
        window.location.replace("dashboard.html");
    }
}

export async function googleLogin(){
    console.log("googleLogin clicked! Initializing provider...");
    const provider=new GoogleAuthProvider();
    try{
        console.log("Opening signInWithPopup...");
        const result=await signInWithPopup(auth,provider);
        console.log("Popup succeeded!", result.user.email);
        const user=result.user;
        await ensureUserProfile(user);
        console.log("Profile ensured. Redirecting...");
        await redirectBasedOnRole(user);
    }catch(error){
        console.error("Google sign-in error:", error);
        alert(error.message||"Google sign-in failed.");
    }
}
window.googleLogin = googleLogin;
window.logout=function(){

    sessionStorage.removeItem('rynix_admin_mode');
    signOut(auth).then(()=>{window.location.href="index.html";}).catch(error=>{console.error("Logout error:",error);window.location.href="index.html";});
};
window.resetPassword=function(email){return sendPasswordResetEmail(auth,email);};
export function setupPasswordToggles(){document.querySelectorAll(".password-toggle").forEach(btn=>{const targetId=btn.getAttribute("data-target");if(!targetId)return;const input=document.getElementById(targetId);if(!input)return;btn.addEventListener("click",()=>{const isPassword=input.type==="password";input.type=isPassword?"text":"password";btn.setAttribute("aria-label",isPassword?"Hide password":"Show password");btn.setAttribute("aria-pressed",isPassword?"true":"false");btn.textContent=isPassword?"\u{1F648}":"\u{1F441}";});});}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",setupPasswordToggles);}else{setupPasswordToggles();}
