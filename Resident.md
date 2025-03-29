Login api: 'http://localhost:5000/api/v1/residents/login'   (POST)
Body:
    {
    "email":"pkpawanrajak@gmail.com",
    "password":"password"
}

Reponse:{
    "statusCode": 200,
    "data": {
        "user": {
            "_id": "67e515627ce99684f6fb0665",
            "email": "pkpawanrajak@gmail.com",
            "fullName": "pawan Kumar",
            "avatar": "https://cdn-icons-png.flaticon.com/512/3177/3177440.png",
            "phoneNo": "934923982",
            "rewardCoins": 130,
            "wasteReports": [
                "67e516bb34e30a6fcb6a60dd",
                "67e51c4f8df6017b99a2adbb"
            ],
            "createdAt": "2025-03-27T09:07:46.981Z",
            "updatedAt": "2025-03-28T18:44:58.095Z",
            "__v": 0,
            "address": "67e515637ce99684f6fb0667"
        },
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2N2U1MTU2MjdjZTk5Njg0ZjZmYjA2NjUiLCJlbWFpbCI6InBrcGF3YW5yYWpha0BnbWFpbC5jb20iLCJyb2xlIjoicmVzaWRlbnQiLCJpYXQiOjE3NDMxODc0OTgsImV4cCI6MTc0MzE5MTA5OH0.6lVQapAonvAOwe9sRYe3hxXHT3jo_yaXe_YXdveCgiE",
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2N2U1MTU2MjdjZTk5Njg0ZjZmYjA2NjUiLCJpYXQiOjE3NDMxODc0OTgsImV4cCI6MTc0NTc3OTQ5OH0.t8KRdcO8f2CyUzZAnOFth0PFjqsXwNYkE452huSSmU4"
    },
    "message": "User logged In Successfully",
    "success": true
}



---
---


Add waste
API: http://localhost:5000/api/v1/residents/submit_waste_report (POST)
Body: 
{
    userReportedType:"plastic" (and can be 'plastic', 'paper', 'metal', 'glass', 'organic','trash','other' ), approximateWeight,assignedZone, coordinates (iin array in long lat format)
}

Response:{
    "statusCode": 201,
    "data": {
        "reportedBy": "67e515627ce99684f6fb0665",
        "photoUrl": [
            "http://res.cloudinary.com/doqoexuer/image/upload/v1743187957/uo7ca697b2v2fgaqokfe.jpg"
        ],
        "userReportedType": "paper",
        "mlIdentifiedType": "paper",
        "approximateWeight": 13,
        "coordinates": {
            "type": "Point",
            "coordinates": [
                79.3434,
                23.42323
            ]
        },
        "status": "useful",
        "_id": "67e6eff5d4d5f48efca7155e",
        "createdAt": "2025-03-28T18:52:37.542Z",
        "__v": 0
    },
    "message": "Waste report submitted successfully",
    "success": true
}

---
---

Resident Dashboard
API: http://localhost:5000/api/v1/residents/get_resident_dashboard  (GET)
Body :n/a
Reponse:{
    "statusCode": 200,
    "data": {
        "totalReports": 3,
        "totalRewards": 130,
        "pendingReports": 0,
        "recentReports": [
            {
                "coordinates": {
                    "type": "Point",
                    "coordinates": [
                        79.3434,
                        23.42323
                    ]
                },
                "_id": "67e516bb34e30a6fcb6a60dd",
                "reportedBy": "67e515627ce99684f6fb0665",
                "photoUrl": [
                    "http://res.cloudinary.com/doqoexuer/image/upload/v1743066808/jbznp5nyzbrrccd4grwa.jpg"
                ],
                "userReportedType": "Plastic",
                "mlIdentifiedType": "Plastic",
                "approximateWeight": 10,
                "status": "admin_approved",
                "createdAt": "2025-03-27T09:13:31.481Z",
                "__v": 0
            },
            {
                "coordinates": {
                    "type": "Point",
                    "coordinates": [
                        79.3434,
                        23.42323
                    ]
                },
                "_id": "67e51c4f8df6017b99a2adbb",
                "reportedBy": "67e515627ce99684f6fb0665",
                "photoUrl": [
                    "http://res.cloudinary.com/doqoexuer/image/upload/v1743068235/bk91fnsinxz3w1oulpnb.jpg"
                ],
                "userReportedType": "metal",
                "mlIdentifiedType": "metal",
                "approximateWeight": 13,
                "status": "collector_assigned",
                "createdAt": "2025-03-27T09:37:19.105Z",
                "__v": 0,
                "assignedZone": "North District"
            },
            {
                "coordinates": {
                    "type": "Point",
                    "coordinates": [
                        79.3434,
                        23.42323
                    ]
                },
                "_id": "67e6eff5d4d5f48efca7155e",
                "reportedBy": "67e515627ce99684f6fb0665",
                "photoUrl": [
                    "http://res.cloudinary.com/doqoexuer/image/upload/v1743187957/uo7ca697b2v2fgaqokfe.jpg"
                ],
                "userReportedType": "paper",
                "mlIdentifiedType": "paper",
                "approximateWeight": 13,
                "status": "useful",
                "createdAt": "2025-03-28T18:52:37.542Z",
                "__v": 0
            }
        ]
    },
    "message": "Dashboard data fetched successfully",
    "success": true
}

