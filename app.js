<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyA0s80j-0fyWnRtY27UF1TZIciIMMaCzbA",
    authDomain: "new-chemist.firebaseapp.com",
    projectId: "new-chemist",
    storageBucket: "new-chemist.firebasestorage.app",
    messagingSenderId: "1009551643410",
    appId: "1:1009551643410:web:0b78e6e1571b54efa899cb",
    measurementId: "G-WJTGP4YBG8"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
