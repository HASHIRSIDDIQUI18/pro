// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCOAyGPtml25a2LpR97BQzcnmaKvG2gdlM",
    authDomain: "newpro-27a1b.firebaseapp.com",
    projectId: "newpro-27a1b",
    storageBucket: "newpro-27a1b.appspot.com",
    messagingSenderId: "694877355388",
    appId: "1:694877355388:web:ac6045daadef474dd7f8f9",
    measurementId: "G-KFB18E8E6B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Hardcoded admin credentials
const adminEmail = "admin@example.com";
const adminPassword = "admin123";

// Event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginForm')) {
        handleLogin();
    }

    if (document.getElementById('addStudentForm')) {
        handleAdminEvents();
    }

    if (document.getElementById('resultForm')) {
        handleStudentEvents();
    }
});

// Login Functionality
function handleLogin() {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        // Check hardcoded admin credentials
        if (email === adminEmail && password === adminPassword) {
            localStorage.setItem('loggedInUser', JSON.stringify({ email: adminEmail, userType: 'admin' }));
            window.location.href = 'admin.html';
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            localStorage.setItem('loggedInUser', JSON.stringify({ email: user.email, userType: 'student' }));
            window.location.href = 'student.html';
        } catch (error) {
            document.getElementById('loginError').textContent = error.message;
        }
    });

    document.getElementById('goToHomepageButton').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}

// Admin Functionality
function handleAdminEvents() {
    document.getElementById('addStudentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const cnic = document.getElementById('cnic').value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create a unique student ID
            const studentId = user.uid; // Use the Firebase user ID

            // Add student to Firestore
            await addDoc(collection(db, 'students'), {
                firstName,
                lastName,
                email: user.email,
                cnic,
                userType: 'Student',
                studentId // Store the student ID
            });

            alert(`Student added successfully! Student ID: ${studentId}`);
        } catch (error) {
            console.error(error);
            alert(error.message);
        }

        // Clear form
        document.getElementById('addStudentForm').reset();
    });

    document.getElementById('uploadMarksForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const course = document.getElementById('course').value;
        const studentId = document.getElementById('studentId').value;
        const marks = document.getElementById('marks').value;
        const totalMarks = document.getElementById('totalMarks').value;
        const grade = document.getElementById('grade').value;

        try {
            await addDoc(collection(db, 'marks'), {
                course,
                studentId,
                marks,
                totalMarks,
                grade
            });

            alert('Marks uploaded successfully!');
        } catch (error) {
            console.error(error);
            alert(error.message);
        }

        // Clear form
        document.getElementById('uploadMarksForm').reset();
    });

    document.getElementById('logoutButton').addEventListener('click', () => {
        signOut(auth).then(() => {
            localStorage.removeItem('loggedInUser');
            window.location.href = 'index.html';
        });
    });
}

// Student Functionality
function handleStudentEvents() {
    const session = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!session) {
        alert('You must be logged in to access this page.');
        window.location.href = 'index.html';
    }

    document.getElementById('logoutButton').addEventListener('click', () => {
        signOut(auth).then(() => {
            localStorage.removeItem('loggedInUser');
            window.location.href = 'index.html';
        });
    });

    document.getElementById('resultForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const resultCNIC = document.getElementById('resultCNIC').value;

        // Query to find the student by CNIC
        const studentRef = collection(db, 'students');
        const studentQuery = query(studentRef, where("cnic", "==", resultCNIC));
        const studentSnapshot = await getDocs(studentQuery);

        if (!studentSnapshot.empty) {
            let studentId;
            studentSnapshot.forEach(doc => {
                const studentData = doc.data();
                studentId = studentData.studentId; // Get the student ID
            });

            // Retrieve marks based on the student ID
            const marksRef = collection(db, 'marks');
            const marksQuery = query(marksRef, where("studentId", "==", studentId));
            const marksSnapshot = await getDocs(marksQuery);

            if (!marksSnapshot.empty) {
                let marksDisplay = 'Marks:\n';
                marksSnapshot.forEach(doc => {
                    const marksData = doc.data();
                    marksDisplay += `Course: ${marksData.course}, Marks: ${marksData.marks}/${marksData.totalMarks} (${marksData.grade})\n`;
                });
                document.getElementById('resultDisplay').textContent = marksDisplay;
            } else {
                document.getElementById('resultDisplay').textContent = 'No marks found for this student.';
            }
        } else {
            document.getElementById('resultDisplay').textContent = 'No student found for this CNIC.';
        }
    });

    // Handle profile editing
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editFirstName = document.getElementById('editFirstName').value;
        const editLastName = document.getElementById('editLastName').value;
        const editCNIC = document.getElementById('editCNIC').value;

        const session = JSON.parse(localStorage.getItem('loggedInUser'));
        const studentRef = collection(db, 'students');
        const studentQuery = query(studentRef, where("cnic", "==", editCNIC));
        const studentSnapshot = await getDocs(studentQuery);

        if (!studentSnapshot.empty) {
            studentSnapshot.forEach(async (doc) => {
                await updateDoc(doc.ref, {
                    firstName: editFirstName,
                    lastName: editLastName,
                    cnic: editCNIC
                });
            });
            alert('Profile updated successfully!');
        } else {
            alert('Student not found!');
        }

        // Clear form
        document.getElementById('editProfileForm').reset();
    });
}
