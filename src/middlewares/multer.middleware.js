import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      if (file.fieldname === 'avatar') {
        cb(null, "./public/avatar");
      } else if (file.fieldname === 'banner') {
        cb(null, "./public/banner");
      }
    else{
      cb(null, "./public/temp")
    }
  },  
    filename: function (req, file, cb) {
      
      cb(null,Date.now()+ '-'+ file.originalname)
    }
  })

  
export const upload = multer({ 
  storage, 
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
})


// Function to dynamically set storage based on the route
const dynamicStorage = (req, file, cb) => {
  // Check the route or any condition to determine where to save the files
  if (req.originalUrl.includes('/dispute')) {
    // If the request is for the dispute route
    cb(null, './public/disputes');  // Save to the 'disputes' folder
  } else if (req.originalUrl.includes('/product')) {
    // If the request is for the product route
    cb(null, './public/ProdImages');  // Save to the 'ProdImages' folder
  } else if (req.originalUrl.includes('/logistic')) {
    // If the request is for the product route
    cb(null, './public/logistic');  // Save to the 'ProdImages' folder
  } else {
    // Default case, if no specific route is matched
    cb(null, './public/other');  // Example fallback folder
  }
};

// Function to generate unique filenames
const dynamicFilename = (req, file, cb) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1]);  // Add extension
};

// Multer upload middleware
export const MultiUpload = multer({
  storage: multer.diskStorage({
    destination: dynamicStorage,  // Dynamically set the destination folder
    filename: dynamicFilename,    // Use the dynamic filename function
  }),
  limits: {fileSize: 50 * 1024 * 1024},
}).array('images', 10);  // Handle up to 10 images




// Define storage for avatar
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/avatar")
  },
  filename: function (req, file, cb) {
    
    cb(null, file.originalname + "-" + Date.now())
  }
});
