import axios from "axios";
import { ApiError } from "./ApiError.js";

// Function to parse coordinates
function parseCoordinates(coords) {
	// Check if the coordinates are a string and looks like an array
	if (typeof coords === 'string') {
	  // Remove any extra spaces, and check if it's a valid array-like string
	  let parsedCoords = coords.trim();
  
	  if (parsedCoords.startsWith('[') && parsedCoords.endsWith(']')) {
		// If it's a valid array-like string, remove the brackets and split by comma
		parsedCoords = parsedCoords.slice(1, -1).split(',').map(coord => parseFloat(coord.trim()));
	  } else {
		// Split the string by comma, handle the coordinates directly
		parsedCoords = parsedCoords.split(',').map(coord => parseFloat(coord.trim()));
	  }
	  
	  console.log('parsed coords:', parsedCoords);
	  return parsedCoords;
	}
  
	// If it's already an array, return it as is
	return coords;
  }
  


async function AddressFromPincode(pincode) {
	try {

		console.log("pincode: " + pincode);
        // Fetch data from Indian Post API
        const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`, { timeout: 500000 });

        const data = response.data;

		console.log(data)

        if (data[0].Status !== "Success") {
           return next( new ApiError(404, 'pincode invalid or could not fetch address from server'));

        }

        // Extract district and city
        const city = data[0].PostOffice[0].District;
        const state = data[0].PostOffice[0].State;
        const country = data[0].PostOffice[0].Country;

        return {
            city,
            state,
			country
        }
	} catch (error) {
		if (error.code === 'ETIMEDOUT') {
			console.error('Request timed out');
			return next( new ApiError(504, 'Request timed out'));

		}
		console.error(error);
		return next( new ApiError(500, 'internal src error: ' + error.message));

	}
	

}

  export {parseCoordinates,
		AddressFromPincode
  }