// Define the URL of the API
const url = 'http://localhost:5000/api/v1/residents/login';

// Define the data you want to send
const data = {
    "email": "pkpawanrajak@gmail.com",
    "password": "password"
};

// Async function to make the POST request
async function loginUser() {
  try {
    // Make the POST request using fetch
    const response = await fetch(url, {
      method: 'POST', // Set the request method to POST
      headers: {
        'Content-Type': 'application/json', // Tell the server you're sending JSON data
      },
      body: JSON.stringify(data), // Convert the data to a JSON string
    });

    // Check if the response is OK (status code in the range 200-299)
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    // Parse the JSON response body
    const responseData = await response.json();
    
    // Handle the data from the response
    console.log('Success:', responseData);
  } catch (error) {
    // Handle any errors that occur during the fetch
    console.error('Error:', error);
  }
}

// Call the async function to make the request
loginUser();
