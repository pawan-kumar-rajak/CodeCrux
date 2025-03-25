import nodemailer from "nodemailer";
import { asyncHandler } from "./asyncHandler.js";
import { Resident} from "../models/resident.model.js";

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  secure: true,
  port: 465,
  auth: {
    user: process.env.EMAIL, // Your email
    pass: process.env.EMAIL_PASSWORD, // Your email password or app password
  },
});


const sendOTPs = async (to, subject, text) => {
  const currentYear = new Date().getFullYear();

  await transporter.sendMail({
    from: `"Crafted India" <${process.env.EMAIL}>`,
    to,
    subject,
    html: `
        <html>
          <head>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
              }
              .email-container {
                width: 100%;
                padding: 20px;
                box-sizing: border-box;
                background-color: #ffffff;
                border: 10px solid #f4b400; /* Floral Border color */
                background-image: url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhdMKs0ecrJyf5-2kmJXZ2Luoz86VSClYW-Q&s');
                background-size: cover;
                border-radius: 10px;
              }
              .email-content {
                padding: 20px;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              }
              h1 {
                color: #1a73e8;
                font-size: 28px;
                text-align: center;
              }
              h2 {
                color: #000;
                font-size: 25px;
                text-align: center;
              }
              p {
                color: #333333;
                font-size: 16px;
                line-height: 1.6;
                text-align: center;
              }
              .cta-button {
                display: inline-block;
                background-color: #1a73e8;
                color: white;
                padding: 10px 20px;
                font-size: 16px;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
                text-align: center;
              }
              .cta-button:hover {
                background-color: #0c59c1;
              }
              footer {
                text-align: center;
                font-size: 12px;
                color: #888888;
                margin-top: 30px;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-content">
                <h1>Hey Buddy , Don't share this OTP to anyone !</h1>
                <p>Your OTP is <h2>${text}</h2></p>
                <footer>
                  <p>&copy; ${currentYear} Crafted India. All Rights Reserved.</p>
                </footer>
              </div>
            </div>
          </body>
        </html>
      `,
    text: `your OTP is : ${text}`,
  });
}

const sendFollowUp = async (user) => {
  const currentYear = new Date().getFullYear();

  await transporter.sendMail({
    from: `"Crafted India" <${process.env.EMAIL}>`,
    to: user.email,
    subject: "Welcome to Our Platform!",
    html: `
        <html>
          <head>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
              }
              .email-container {
                width: 100%;
                padding: 20px;
                box-sizing: border-box;
                background-color: #ffffff;
                border: 10px solid #f4b400; /* Floral Border color */
                background-image: url('https://t4.ftcdn.net/jpg/09/67/05/63/360_F_967056341_X6fQBd2Jz3bcFi7Wk8Acv6uCu5uj5FiM.jpg');
                background-size: cover;
                border-radius: 10px;
              }
              .email-content {
                padding: 20px;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              }
              h1 {
                color: #1a73e8;
                font-size: 28px;
                text-align: center;
              }
              p {
                color: #333333;
                font-size: 16px;
                line-height: 1.6;
                text-align: center;
              }
              .cta-button {
                display: inline-block;
                background-color: #1a73e8;
                color: white;
                padding: 10px 20px;
                font-size: 16px;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
                text-align: center;
              }
              .cta-button:hover {
                background-color: #0c59c1;
              }
              footer {
                text-align: center;
                font-size: 12px;
                color: #888888;
                margin-top: 30px;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-content">
                <h1>Welcome to Our Platform Crafted India!</h1>
                <p>Dear ${user.fullName},\n\nThank you for registering. We're excited to have you onboard!\n\nBest regards,\nThe Team Crafted India</p>
            
                <footer>
                  <p>&copy; ${currentYear} Crafted India. All Rights Reserved.</p>
                </footer>
              </div>
            </div>
          </body>
        </html>
      `,
    text: `Dear ${user.fullName},\n\nThank you for registering. We're excited to have you onboard!\n\nBest regards,\nThe Team Crafted India`,
  })
}

// Low stock alert
const sendLowStockAlert =async () => {
  const currentYear = new Date().getFullYear();

  const lowStockProducts = await Product.find({ stockQuantity: { $lte: 5 } }).populate("createdBy");

  for (const product of lowStockProducts) {
    const artisan = product.createdBy;
    const mailOptions = {
      from: process.env.EMAIL,
      to: artisan.email,
      subject: "Low Stock Alert !",
      html: `
        <html>
          <head>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
              }
              .email-container {
                width: 100%;
                padding: 20px;
                box-sizing: border-box;
                background-color: #ffffff;
                border: 10px solid #f4b400; /* Floral Border color */
                background-image: url('https://t4.ftcdn.net/jpg/09/67/05/63/360_F_967056341_X6fQBd2Jz3bcFi7Wk8Acv6uCu5uj5FiM.jpg');
                background-size: cover;
                border-radius: 10px;
              }
              .email-content {
                padding: 20px;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              }
              h1 {
                color: #1a73e8;
                font-size: 28px;
                text-align: center;
              }
              p {
                color: #333333;
                font-size: 16px;
                line-height: 1.6;
                text-align: center;
              }
              .cta-button {
                display: inline-block;
                background-color: #1a73e8;
                color: white;
                padding: 10px 20px;
                font-size: 16px;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
                text-align: center;
              }
              .cta-button:hover {
                background-color: #0c59c1;
              }
              footer {
                text-align: center;
                font-size: 12px;
                color: #888888;
                margin-top: 30px;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-content">
                <h1>Stock is Low dear ${ProductName}!</h1>
                <p>Dear ${artisan.fullName},\n\nYour product "${ProductName}" is running low on stock. Please restock it soon to avoid missing sales opportunities.\n\nBest regards,\nThe Team Crafted India</p>
            
                <footer>
                  <p>&copy; ${currentYear} Crafted India. All Rights Reserved.</p>
                </footer>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Dear ${artisan.fullName},\n\nYour product "${ProductName}" is running low on stock. Please restock it soon to avoid missing sales opportunities.\n\nBest regards,\nThe Team Crafted India`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Low stock email sent to:", artisan.email);
  }
};


const sendLowStockAlertToCustomer =async () => {
  console.log("trying to send ...")
  const currentYear = new Date().getFullYear();

   // Fetch low stock products
   const lowStockProducts = await Product.find({ stockQuantity: { $lte: 5 } });
  //  console.log("low stocks: ", lowStockProducts)

    // Fetch all wishlists and carts
    const wishlists = await Wishlist.find()
    console.log("wishlist: ", wishlists)
    const carts = await Cart.find().populate("user items.productId");

    // Map of low stock product IDs for quick lookup
    const lowStockProductIds = new Set(lowStockProducts.map(product => product._id.toString()));
    // console.log("low stock ids: ", lowStockProductIds)

    // Function to add user notifications
    const addUserNotifications = (user, product, notifications) => {
        if (lowStockProductIds.has(product._id.toString())) {
            notifications.push({ user, product });
        }
    };
    console.log("add user : ", addUserNotifications)

    // User notifications array
    const userNotifications = [];

    // Check wishlists
    wishlists.forEach(wishlist => {
        wishlist.items.forEach(item => {
            addUserNotifications(wishlist.userId, item.productId, userNotifications);
        });
    });

    // Check carts
    carts.forEach(cart => {
        cart.items.forEach(item => {
            addUserNotifications(cart.user, item.productId, userNotifications);
        });
    });

    // Filter out notifications with null values
    const validNotifications = userNotifications.filter(notification => notification.user && notification.product);

    // Filter duplicate notifications
    const uniqueNotifications = validNotifications.filter((notification, index, self) => 
        index === self.findIndex((n) => 
            n.user._id.toString() === notification.user._id.toString() && 
            n.product._id.toString() === notification.product._id.toString()
        )
    );
    console.log("notify: ",uniqueNotifications)

    // Send low stock alert emails
    for (const notification of uniqueNotifications) {
        const { user, product } = notification;
        console.log("user: " , user)
        const userId = user.toString()
        const productId = product.toString()
      const userDetail = await Customer.findOne({_id:userId}).select("fullName email")
      const ProductDetail = await Product.findOne({_id:productId})
      console.log("user detail: ", userDetail)
    
      if(userDetail)
      {
      const mailOptions = {
      from: process.env.EMAIL,
      to: userDetail.email,
      subject: "Low Stock Alert !",
      html: `
        <html>
          <head>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
              }
              .email-container {
                width: 100%;
                padding: 20px;
                box-sizing: border-box;
                background-color: #ffffff;
                border: 10px solid #f4b400; /* Floral Border color */
                background-image: url('https://t4.ftcdn.net/jpg/09/67/05/63/360_F_967056341_X6fQBd2Jz3bcFi7Wk8Acv6uCu5uj5FiM.jpg');
                background-size: cover;
                border-radius: 10px;
              }
              .email-content {
                padding: 20px;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              }
              h1 {
                color: #1a73e8;
                font-size: 28px;
                text-align: center;
              }
              p {
                color: #333333;
                font-size: 16px;
                line-height: 1.6;
                text-align: center;
              }
              .cta-button {
                display: inline-block;
                background-color: #1a73e8;
                color: white;
                padding: 10px 20px;
                font-size: 16px;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
                text-align: center;
              }
              .cta-button:hover {
                background-color: #0c59c1;
              }
              footer {
                text-align: center;
                font-size: 12px;
                color: #888888;
                margin-top: 30px;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-content">
                <h1>Stock is Low dear ${userDetail.fullName}!</h1>
                <p>Dear ${userDetail.fullName},\n\nYour product "${ProductDetail.title}" is running low on stock. Please try to purchase it soon to avoid missing sales opportunities.\n\nBest regards,\nThe Team Crafted India</p>
            
                <footer>
                  <p>&copy; ${currentYear} Crafted India. All Rights Reserved.</p>
                </footer>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Dear ${userDetail.fullName},\n\nYour product "${ProductDetail.title}" is running low on stock. Please purchase the product soon to avoid missing sales opportunities.\n\nBest regards,\nThe Team Crafted India`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Low stock email sent to:", user.email);
  }}
};



const sendOrderDetailsToArtisan = async (artisan, order) => {
  const currentYear = new Date().getFullYear();

  const { productId, quantity, orderId, shippingAddress, totalPrice } = order;

  // Retrieve product details for the email content
  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, "Product not found for email generation");
  }

  // Email content
  await transporter.sendMail({
    from: `"Crafted India" <${process.env.EMAIL}>`,
    to: artisan.email,
    subject: "Congrats! You have received a new order!",
    html: `
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .email-container {
              width: 100%;
              padding: 20px;
              box-sizing: border-box;
              background-color: #ffffff;
              border: 10px solid #f4b400;
              background-image: url('https://t4.ftcdn.net/jpg/09/67/05/63/360_F_967056341_X6fQBd2Jz3bcFi7Wk8Acv6uCu5uj5FiM.jpg');
              background-size: cover;
              border-radius: 10px;
            }
            .email-content {
              padding: 20px;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #1a73e8;
              font-size: 28px;
              text-align: center;
            }
            p {
              color: #333333;
              font-size: 16px;
              line-height: 1.6;
              text-align: left;
            }
            .product-details {
              display: flex;
              align-items: center;
              margin-bottom: 20px;
            }
            .product-details img {
              width: 80px;
              height: 80px;
              object-fit: cover;
              margin-right: 15px;
            }
            .cta-button {
              display: inline-block;
              background-color: #1a73e8;
              color: white;
              padding: 10px 20px;
              font-size: 16px;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
              text-align: center;
            }
            .cta-button:hover {
              background-color: #0c59c1;
            }
            footer {
              text-align: center;
              font-size: 12px;
              color: #888888;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="email-content">
              <h1>New Order Notification!</h1>
              <p>Dear ${artisan.fullName},</p>
              <p>
                We are excited to inform you that you have received a new order for your product!
              </p>
              <h2>Order Details:</h2>
              <div class="product-details">
                <img src="${product.images[0]}" alt="${product.title}">
                <div>
                  <h3 style="margin: 0; color: #333333; font-size: 18px;">${product.title}</h3>
                  <p><strong>Quantity:</strong> ${quantity}</p>
                  <p><strong>Total Price:</strong> ₹${totalPrice}</p>
                  <p><strong>Order ID:</strong> ${orderId}</p>
                  <p><strong>Shipping Address:</strong><br>
                    ${shippingAddress.country}, ${shippingAddress.state}, ${shippingAddress.city}, ${shippingAddress.pinCode}
                  </p>
                </div>
              </div>
              <p>
                Please ensure timely preparation and communication for the best customer experience. Thank you for your hard work and dedication!
              </p>
              <a href="" class="cta-button">Go to Dashboard</a>
              <p>Go to dashboard to cancel the order within 24 hours, else you have to be responsible for the inconvenience.</p>
              <footer>
                <p>&copy; ${currentYear} Crafted India. All Rights Reserved.</p>
              </footer>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Dear ${artisan.fullName},

      We are excited to inform you that you have received a new order for your product!

      Order Details:
      - Product Name: ${product.title}
      - Quantity: ${quantity}
      - Total Price: ₹${totalPrice}
      - Order ID: ${orderId}
      - Shipping Address: ${shippingAddress.country}, ${shippingAddress.state}, ${shippingAddress.city}, ${shippingAddress.pinCode}

      Please ensure timely preparation and communication for the best customer experience.

      Best regards,
      Crafted India Team
    `,
  });
};


//send cancel notification
const sendCancellationDetailsToArtisan = async (artisan, order) => {
  const currentYear = new Date().getFullYear();

  const { productId, quantity, orderItemId } = order;
  // Retrieve product details for the email content
  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, "Product not found for email generation");
  }
  const totalPrice = product.sellerPrice * quantity;

  await transporter.sendMail({
    from: `"Crafted India" <${process.env.EMAIL}>`,
    to: artisan.email,
    subject: "Order Cancellation Notification",
    html: `
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .email-container {
              width: 100%;
              padding: 20px;
              box-sizing: border-box;
              background-color: #ffffff;
              border: 10px solid #d9534f; /* Red border for cancellation */
              background-image: url('https://t4.ftcdn.net/jpg/09/67/05/63/360_F_967056341_X6fQBd2Jz3bcFi7Wk8Acv6uCu5uj5FiM.jpg');
              background-size: cover;
              border-radius: 10px;
            }
            .email-content {
              padding: 20px;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #d9534f;
              font-size: 28px;
              text-align: center;
            }
            p {
              color: #333333;
              font-size: 16px;
              line-height: 1.6;
              text-align: left;
            }
            footer {
              text-align: center;
              font-size: 12px;
              color: #888888;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="email-content">
              <h1>Order Cancellation Notice</h1>
              <p>Dear ${artisan.fullName},</p>
              <p>
                We regret to inform you that the following order has been canceled by the customer:
              </p>
              <h2>Order Details:</h2>
              <div class="product-details">
                <img src="${product.images[0]}" alt="${product.title}">
                <div>
                  <h3 style="margin: 0; color: #333333; font-size: 18px;">${product.title}</h3>
                  <p><strong>Quantity:</strong> ${quantity}</p>
                  <p><strong>Total Price:</strong> ₹${totalPrice}</p>
                  <p><strong>Order ID:</strong> ${orderItemId}</p>
                  
                </div>
              </div>
              <p>
                We apologize for any inconvenience caused. If you have any concerns or need further assistance, please contact our support team.
              </p>
              <footer>
                <p>&copy; ${currentYear} Crafted India. All Rights Reserved.</p>
              </footer>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Dear ${artisan.fullName},

      We regret to inform you that the following order has been canceled by the customer:

      Order Details:
      - Product Name: ${product.title}
      - Quantity: ${quantity}
      - Total Price: ₹${totalPrice}
      - Order ID: ${orderItemId}
      

      We apologize for any inconvenience caused. If you have any concerns, please contact our support team.

      Best regards,
      Crafted India Team
    `,
  });
};

const sendArtisanCancellationEmail = async (customer, order, canceledItems) => {
  const itemDetails = canceledItems
    .map(item => `
      <li style="display: flex; align-items: center; margin-bottom: 15px;">
        <img src="${item.productId.images[0]}" alt="${item.productId.title}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 15px;">
        <div>
          <h2 style="margin: 0; color: #333333; font-size: 16px;">${item.productId.title} (Quantity: ${item.quantity})</h2>
        </div>
      </li>`)
    .join("");

  const currentYear = new Date().getFullYear();

  await transporter.sendMail({
    from: `"Crafted India" <${process.env.EMAIL}>`,
    to: customer.email,
    subject: "Order Cancellation Due to Artisan Unavailability",
    html: `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .email-container {
              width: 100%;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              box-sizing: border-box;
              background-color: #ffffff;
              border: 1px solid #ddd;
              border-radius: 8px;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #1a73e8;
              font-size: 22px;
              text-align: center;
              margin-bottom: 20px;
            }
            p {
              color: #333333;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 10px;
            }
            ul {
              list-style-type: none;
              padding: 0;
            }
            li {
              margin-bottom: 8px;
              color: #555555;
            }
            .cta-button {
              display: inline-block;
              background-color: #1a73e8;
              color: white;
              padding: 10px 20px;
              font-size: 16px;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
              text-align: center;
            }
            .cta-button:hover {
              background-color: #0c59c1;
            }
            footer {
              text-align: center;
              font-size: 12px;
              color: #888888;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <h1>Order Cancellation Notification</h1>
            <p>Dear ${customer.name},</p>
            <p>We regret to inform you that the following items in your order <strong>#${order._id}</strong> have been canceled because the artisan is currently unavailable:</p>
            <ul>
              ${itemDetails}
            </ul>
            <p>If you need assistance or wish to explore alternative options, please <a href="https://craftedindia.com/contact" class="cta-button">Contact Support</a>.</p>
            <p>We apologize for any inconvenience caused and appreciate your understanding.</p>
            <footer>
              <p>&copy; ${currentYear} Crafted India. All Rights Reserved.</p>
            </footer>
          </div>
        </body>
      </html>
    `,
  });
};

const sendDisputeNotificationToArtisan = async (artisan, dispute, order, orderItem) => {
  const currentYear = new Date().getFullYear();

  await transporter.sendMail({
    from: `"Crafted India" <${process.env.EMAIL}>`,
    to: artisan.email,
    subject: "Dispute Notification: Action Required",
    html: `
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .email-container {
              width: 100%;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #ffffff;
              border: 1px solid #ddd;
              border-radius: 8px;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #e63946;
              font-size: 22px;
              text-align: center;
            }
            p {
              color: #333333;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 10px;
            }
            ul {
              list-style-type: none;
              padding: 0;
            }
            li {
              margin-bottom: 8px;
              color: #555555;
            }
            .cta-button {
              display: inline-block;
              background-color: #1a73e8;
              color: white;
              padding: 10px 20px;
              font-size: 16px;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
              text-align: center;
            }
            .cta-button:hover {
              background-color: #0c59c1;
            }
            footer {
              text-align: center;
              font-size: 12px;
              color: #888888;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <h1>Dispute Raised Against Your Product</h1>
            <p>Dear ${artisan.fullName},</p>
            <p>A dispute has been raised by a customer for the following product in their order:</p>
            <ul>
              <li><strong>Product Name:</strong> ${orderItem.productId.title}</li>
              <li><strong>Order ID:</strong> ${order._id}</li>
              <li><strong>Quantity:</strong> ${orderItem.quantity}</li>
              <li><strong>Reason for Dispute:</strong> ${dispute.reason}</li>
              <li><strong>Details:</strong> ${dispute.details}</li>
            </ul>
            ${dispute.proofFiles.length > 0 ? `
            <p>The customer has also provided the following proof files:</p>
            <ul>
              ${dispute.proofFiles.map((file, index) => `<li><a href="${file}" target="_blank">Proof File ${index + 1}</a></li>`).join('')}
            </ul>` : ''}
            <p>We request you to review the dispute and provide your response at the earliest. Please log in to your dashboard to take the necessary actions.</p>
            <a href="https://craftedindia.com/dashboard" class="cta-button">Go to Dashboard</a>
            <p>Thank you for your attention to this matter. Please reach out to support if you have any questions or concerns.</p>
            <footer>
              <p>&copy; ${currentYear} Crafted India. All Rights Reserved.</p>
            </footer>
          </div>
        </body>
      </html>
    `,
    text: `
      Dear ${artisan.fullName},

      A dispute has been raised by a customer for the following product in their order:

      - Product Name: ${orderItem.productId.title}
      - Order ID: ${order._id}
      - Quantity: ${orderItem.quantity}
      - Reason for Dispute: ${dispute.reason}
      - Details: ${dispute.details}

      ${dispute.proofFiles.length > 0 ? `
      The customer has also provided the following proof files:
      ${dispute.proofFiles.map((file, index) => `- Proof File ${index + 1}: ${file}`).join('\n')}
      ` : ''}

      We request you to review the dispute and provide your response at the earliest. Please log in to your dashboard to take the necessary actions.

      Thank you for your attention to this matter. Please reach out to support if you have any questions or concerns.

      Best regards,
      Crafted India Team
    `,
  });
};



export {
  sendOTPs,
  sendFollowUp,
  sendLowStockAlert,
  sendOrderDetailsToArtisan,
  sendCancellationDetailsToArtisan,
  sendArtisanCancellationEmail,
  sendDisputeNotificationToArtisan,
  sendLowStockAlertToCustomer
}