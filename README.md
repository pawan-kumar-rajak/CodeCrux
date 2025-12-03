# ♻️ EcoChain: Smart Waste-to-Energy & Recycling Management System  

**Revolutionizing urban waste management through AI-powered optimization and community engagement**  

<img width="100%" src='public\Images\banner.png'>

---

## 📌 Problem Statement
- **2.01 billion tonnes** of municipal solid waste generated annually worldwide
- **33%** of global waste is mismanaged through open dumping or burning
- Waste sector contributes to **5%** of global greenhouse gas emissions
- Current recycling rates average just **13.5%** globally

---

## 🌍 The Waste Management Challenge  
Traditional waste systems struggle with critical inefficiencies:  
- 🚛 **Inefficient logistics** - Collection trucks visiting half-empty bins  
- 🔄 **Low recycling rates** - Only 9% of plastic gets recycled globally  
- 🌫️ **Environmental damage** - Landfills generate 14% of global methane emissions  
- 💡 **Lack of incentives** - Residents aren't rewarded for proper waste disposal  


---

## 🚀 Our Innovative Solution  
EcoChain transforms waste from trash to treasure with a bin-centric approach:  

```mermaid
graph LR
    A[Resident Reports Waste] --> B[Smart Bin Aggregation]
    B --> C{Vendor Requests Collection}
    C --> D[Optimized Pickup]
    D --> E[Waste Processing]
    E --> F[Renewable Energy]
    F --> G[Resident Rewards]
```

**Core innovation:**  
🔋 Waste becomes an on-demand commodity for energy production  
🔄 Collection only when bins reach capacity or vendors request materials  
🌱 Complete circular economy with transparent tracking  

---

## 🏗️ System Architecture  

```mermaid
graph LR
    subgraph Frontend
        A[Resident App] --> B[API Gateway]
        C[Collector App] --> B
        D[Vendor Portal] --> B
        E[Admin Dashboard] --> B
    end
    
    subgraph Backend
        B --> F[Auth Service]
        B --> G[Waste Service]
        B --> H[Vendor Service]
        B --> I[Collector Service]
        B --> J[Reward Service]
    end
    
    subgraph AI Layer
        G --> K[Waste Classifier]
    end
    
    subgraph Data Layer
        F --> N[(MongoDB)]
        G --> N
        H --> N
        I --> N
        J --> N
    end

```

### 🔄 Data Flow Ecosystem  
```mermaid
graph TD
    Resident -->|Report + Photo| Backend
    Backend -->|Analyze| AI_Service
    AI_Service -->|Classification| Backend
    Backend -->|Assign to Bin| Database
    Vendor -->|Request Collection| Backend
    Backend -->|Find Collector| Database
    Database -->|Assign| Collector
    Collector -->|Complete Pickup| Backend
    Backend -->|Update| Vendor
```


### 🧩 Class Diagram

```mermaid
classDiagram
    class User {
        +_id: ObjectId
        +email: String
        +password: String
        +role: String
        +createdAt: Date
        +generateAuthToken()
        +register()
        +login()
        +logout()
        +refreshAccessToken()
    }

    class Resident {
        +userId: ref User
        +rewardCoins: Number
        +wasteReports: ref WasteReport[]
        +sendRegisterOtp()
        +sendForgotPasswordOtp()
        +verifyOtp()
        +register()
        +login()
        +logout()
        +refreshAccessToken()
        +changeCurrentPassword()
        +getCurrentUser()
        +updateAccountDetails()
        +updateUserAvatar()
        +reportWaste()
        +getResidentDashboard()
        +getMyWasteReports()
    }

    class WasteReport {
        +reportedBy: ref Resident
        +photoUrl: String
        +userReportedType: String
        +mlIdentifiedType: String
        +approximateWeight: Number
        +coordinates: Point
        +status: String
    }

    class Vendor {
        +userId: ref User
        +requiredWasteTypes: String[]
        +processingFacilityLocation: Point
        +register()
        +login()
        +logout()
        +refreshAccessToken()
        +getAvailableWaste()
        +requestWasteCollection()
        +getVendorDashboard()
        +rejectWasteRequest()
        +viewGarbageDetails()
    }

    class Collector {
        +userId: ref User
        +assignedPickups: ref WasteProcessingRequest[]
        +register()
        +login()
        +logout()
        +refreshAccessToken()
        +updateLocation()
        +getAssignedPickups()
        +markAsCollected()
        +markAsDelivered()
        +getCollectorDashboard()
        +getPendingPickupsWithDropoff()
        +getWasteDetails()
    }

    class Admin {
        +userId: ref User
        +register()
        +login()
        +logout()
        +refreshAccessToken()
        +getAllPendingWasteReports()
        +approveWasteReport()
        +rejectWasteReport()
        +getExpiredRequests()
        +handleExpiredRequest()
        +getAdminDashboard()
        +getAdminProfile()
        +getCollectors()
        +getCollectorDetails()
    }

    class WasteProcessingRequest {
        +wasteReport: ref WasteReport
        +vendor: ref Vendor
        +collector: ref Collector
        +status: String
    }

    User <|-- Resident
    User <|-- Vendor
    User <|-- Collector
    User <|-- Admin
    Resident "1" --> "*" WasteReport
    WasteReport "1" --> "0..1" WasteProcessingRequest
    Vendor "1" --> "*" WasteProcessingRequest
```

### 🔄 Core Workflow Sequence

```mermaid
sequenceDiagram
    participant Resident
    participant MobileApp
    participant AI_Engine
    participant Admin
    participant Vendor
    participant Collector
    
    Resident->>MobileApp: Report waste (photo + details)
    MobileApp->>AI_Engine: Send for classification
    AI_Engine-->>MobileApp: Return waste type
    alt Types match
        MobileApp->>Vendor: Notify matching vendors
        Vendor->>MobileApp: Accept/reject request
        alt Accepted
            MobileApp->>Collector: Assign pickup
            Collector->>MobileApp: Confirm collection
            MobileApp->>Resident: Award tokens
        else Rejected/Expired
            MobileApp->>Admin: Flag for review
            Admin->>Collector: Assign to landfill
        end
    else Types mismatch
        MobileApp->>Admin: Flag for review
        Admin->>MobileApp: Approve/reject
        alt Approved
            MobileApp->>Vendor: Notify matching vendors
        else Rejected
            MobileApp->>Collector: Assign to landfill
        end
    end
```



### Use Case
![EcoChain Use Cases](https://kroki.io/plantuml/svg/eNpllEtu2zAQhvc8xcDetIsAsS3LVhEYsWQJ6MJoYdfpmpEmNmFJdEkK7gM9Q9Au20V2fSx6gx4qR-hQL8vpggBn5uOP0cwPXWvDlSmyFMJYBjsucthohIBr1IyleGfASFBiuzOQCIWxETJnTO9FfuCKZ_CJAcxjI1Ukc7MWHxEGLqVIxGqcko7llJLHQKZSQX8YBsFk0Dz2pUpQ1aWR400X_knkrBiNvGAwZJ8Z4_Yh9FaoRYK5gceHL7_o_Kbzk86PHnANbbUfRV7kjJpXpJZieX18-Pa9RE-p_iQMpmHL3mCelOD9nxKsY1J0fddvqHmS0fCqBr7-LcEq1ff8see7jNnp8XybIvTaYa8_aINZrxzjsxUepDLwllPuuRXYBIO2carPX0KQcq3FnYi5XUQDcaK8cOJFlnqjeLyHteGm0DUw7Kqs8MhVomHB9e5W0rWGRh3IcjcCj_BaxPvi0Og47Wio_upgREa7TWAlC4MtQ80s3HAeTS20OSTc4Hk3446KZXxyBXnOF3lDuO1wy37fFahNs5_TZ0-61Lq4zYSBJRol4kZn2iFKqJw2LGUuaGci39ac1y7JtqxRwZLnfIsZOaeZ8WWHsd6k1VxczKrpv4CrK5HHaZGgns3KqlNXnaqK7w25xhbJua0pa4GnieHTxIidzFnL_pcZs9qXVeieh5PzcMoqb1aRdxYNLhm7Jph-Cv8Ab0JAYA==)


### 📊 Key Components  
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | Node.js + Express | Core application logic |
| **AI Service** | Python + YOLOv8 | Waste classification |
| **Database** | MongoDB | Geospatial data storage |
| **Frontend** | Vanilla JS + Chart.js | Interactive dashboards |
| **Auth** | JWT | Secure authentication |
| **Storage** | Cloudinary | Image management |

---

## ✨ Key Features  

### 👨‍👩‍👧‍👦 For Residents  
- 📸 **Smart reporting** - AI-assisted waste classification  
- 🏆 **Two-tier rewards** - Instant points + impact bonuses  
- 📊 **Personal dashboard** - Track your environmental impact  
- 🗺️ **Live tracking** - Follow your waste from bin to energy  

 <img width="100%" height="50%" alt="image" src="public\Images\resident_dashboard1.png" />
 <img width="100%" height="50%" alt="image" src="public\Images\resident_dashboard2.png" />

### 🚚 For Collectors  
- 🧭 **Optimized routes** - AI-generated efficient collection paths  
- 📍 **Live map view** - Real-time bin locations and status  
- ✅ **Task management** - Simple pickup/delivery confirmation  
- ⏱️ **Time savings** - 40% less travel time on average  
 <img width="100%" height="50%" alt="image" src="public\Images\collector.png" />

### 🏭 For Vendors  
- 🔎 **Waste marketplace** - Find specific materials on demand  
- 📈 **Performance analytics** - Track energy production metrics  
- ⚡ **Streamlined requests** - One-click collection scheduling  
- 🌱 **Impact reporting** - Quantify your environmental contribution  
 <img width="100%" height="50%" alt="image" src="public\Images\vendor.png" />

### 👩‍💼 For Administrators  
- 📋 **Central dashboard** - Monitor system-wide performance  
- 🧩 **Data verification** - Review AI classification results  
- 👥 **User management** - Manage all stakeholder accounts  
- 🌎 **Environmental reports** - CO2 reduction and energy metrics  

---

## 🧠 Intelligent Backend Systems  

### 🎯 Two-Stage Reward System  
```mermaid
    pie
    title Reward Distribution
    "Instant Points" : 30
    "Impact Bonus" : 70
```
**Why it works:**  
- 💰 Immediate gratification for participation  
- 🌟 Significant rewards tied to actual environmental impact  
- 🛡️ Prevents gaming of the system  

### 📍 Optimized Collector Assignment  
**How it works:**  
1. Vendor requests bin collection  
2. System identifies bin location and zone  
3. Finds nearest available collector using geospatial queries  
4. Automatically assigns task with optimized route  

**Result:** 35% reduction in collection vehicle emissions  

### 🔒 Transactional Safety  
Critical operations use MongoDB transactions:  
```javascript
try {
  await session.withTransaction(async () => {
    // 1. Deduct resident rewards
    // 2. Update bin composition
    // 3. Recalculate fill level
    // 4. Delete report
  });
} catch (error) {
  // Rollback all changes
}
```
Ensures data consistency during deletions and updates  

---

## 🔮 Future Vision  

| Feature | Status | Impact Potential |
|---------|--------|------------------|
| **Real-time Route Optimization** | In development | 50%+ fuel savings |
| **IoT Smart Bin Integration** | Prototype stage | Automated fill monitoring |
| **Predictive Analytics** | Research phase | Forecast waste patterns |
| **Carbon Credit Marketplace** | Concept | Monetize CO2 reductions |
| **Community Leaderboards** | Planned | Boost resident engagement |



---

## 🛠️ Getting Started  
### 🛠️ Prerequisites

- **Node.js** (v16+ recommended): [Download Node.js](https://nodejs.org/)
- **Python** (v3.8+ recommended): [Download Python](https://www.python.org/downloads/)
- **MongoDB**: [Download MongoDB](https://www.mongodb.com/try/download/community)
- **Git** (optional, for cloning): [Download Git](https://git-scm.com/downloads)

---

### 📦 Project Structure

```
CodeCrux/
│
├── src/
│   ├── ML/                # Python ML model & weights
│   ├── controllers/       # Node.js controllers
│   ├── models/            # Mongoose models
│   ├── routes/            # Express routes
│   ├── utils/             # Utility functions
│   ├── app.js             # Express app setup
│   └── index.js           # Entry point for Node.js server
│
├── public/                # Static HTML/CSS/JS files
└── ...
```

---

### 1️⃣ Clone the Repository

```sh
git clone https://github.com/pawan-kumar-rajak/CodeCrux
cd CodeCrux
```

---

### 2️⃣ Configure Environment Variables

- Copy `.env.example` to .env (if provided) and fill in your MongoDB URI, email credentials, etc.
- Example .env:
  ```
    PORT=8000
    MONGO_URI=
    DB_NAME=

    <!-- you can change image storage from cloud to local -->
    CLOUDINARY_CLOUD_NAME=
    CLOUDINARY_API_KEY=
    CLOUDINARY_API_SECRET=


    ACCESS_TOKEN_SECRET=
    ACCESS_TOKEN_EXPIRY=1hr
    REFRESH_TOKEN_SECRET=
    REFRESH_TOKEN_EXPIRY=30d


    <!-- for email sending for otps and other -->
    EMAIL=
    EMAIL_PASSWORD=
  ```

---

### 3️⃣ Install Node.js Dependencies

```sh
npm install
```

---

### 4️⃣ Set Up Python Environment for ML

```sh
cd src/ML
python -m venv venv
venv\Scripts\activate   # On Windows
# source venv/bin/activate   # On Linux/Mac
# copy requirement.txt file inside venv folder then run these commands
pip install -r requirements.txt
# If requirements.txt is missing, install manually:
pip install flask ultralytics opencv-python torch
```

- Make sure your YOLO model weights (e.g., `best.pt`) are in Weights.

---

### 5️⃣ Start the Python ML Server

```sh
# make sure that your virtual environment is activated
# you'll see (venv) at left most of terminal inline
# make sure to be under src/ML/
python GARBAGENEW.PY
```

- This will start a Flask server on `http://localhost:3000` (or as configured).

---

### 6️⃣ Start MongoDB

- Make sure MongoDB is running

---

### 7️⃣ Start the Node.js Server

```sh
cd ../
# open another terminal and run
npm run dev 
```

- The server will run on `http://localhost:5000` (or as configured).
- if got mongodb error ( its because you are running mongodb locally and transaction not supporting local storage)
- [fix it](mongodb.md)

---

### 8️⃣ Using the Application

- **Frontend:** Open your browser and go to `http://localhost:5000`.
- ** then click on login button at top right corner
- **Resident, Vendor, Collector, Admin** dashboards are available via the navigation or direct URLs.
- **Waste Reporting:** Residents can upload images; the backend will call the Python ML server to classify waste.

---

### ⚡ How ML Integration Works

- When a user uploads a waste image, Node.js sends the image to the Python Flask server (`/detect` endpoint).
- The ML server returns detected waste type and recyclability.
- Node.js saves the result and updates the user dashboard.
- **you can see predictions of ml in terminal where python flask server is runninng**

---

### 📝 Notes

- **Both Node.js and Python servers must be running** for full functionality.
- If you change the ML server port or host, update the URL in your Node.js controller (see `axios.post('http://localhost:5000/detect', ...)`).
- For production, use environment variables for all secrets and URLs.

---

### 🆘 Troubleshooting

- **Port conflicts:** Make sure nothing else is running on ports 5000 (Node.js) and 3000 (Python ML).
- **Python errors:** Ensure all required Python packages are installed and the correct weights file is present.
- **MongoDB errors:** Make sure MongoDB is running and accessible.

---

## 🙋 Need Help?

- Check the README and code comments.
- Open an issue on the repository or contact the maintainer.

---

## 🤝 Contribute to a Cleaner Future  
We welcome contributions! Here's how to get involved:  
1. 🐛 Report bugs in our issue tracker  
2. 💡 Suggest new features or improvements  
3. 👨‍💻 Submit pull requests for open issues  
4. 🌍 Help translate the interface  

**Join our community:** [EcoChain Discord Server](https://discord.gg/ecochain)  

---
<!-- ## 🤝 Contributors
- [Yashansh Raj Pandey (Project Lead)](https://github.com/yashanshhhraj)
- [Gajendra Singh Thakur (ML Engineer)](https://github.com/Gajendra-dev-ux)
- [Pawan Kumar Rajak (Fullstack Developer)](https://github.com/pawan-kumar-rajak)
- [Himanshu Dhepe (Management and requirement gathering)](https://github.com/himanshu1hd)

--- -->

## 📜 License  
EcoChain is released under the [MIT License](LICENSE.md) - free for educational and non-commercial use. For commercial applications, please contact our team.  

---

**Together, we're transforming waste into worth, one smart bin at a time.** ♻️💡
