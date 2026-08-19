import { data } from "react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://glomore.in",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function loader({ request }: { request: Request }) {
  // Handle CORS preflight request
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const url = new URL(request.url);
  const pincode = url.searchParams.get("pincode");

  // Validate pincode
  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return data(
      {
        error: "Please provide a valid 6-digit pincode",
      },
      {
        status: 400,
        headers: corsHeaders,
      }
    );
  }

  try {
    // Call India Post API from the backend
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pincode}`
    );

    if (!response.ok) {
      return data(
        {
          error: "India Post API request failed",
        },
        {
          status: 502,
          headers: corsHeaders,
        }
      );
    }

    const indiaPostData = await response.json();

    // Check India Post response
    if (
      !Array.isArray(indiaPostData) ||
      !indiaPostData[0] ||
      indiaPostData[0].Status !== "Success"
    ) {
      return data(
        {
          pincode,
          available: false,
          message: "Pincode not found",
        },
        {
          headers: corsHeaders,
        }
      );
    }

    const postOfficeData = indiaPostData[0].PostOffice || [];

    if (postOfficeData.length === 0) {
      return data(
        {
          pincode,
          available: false,
          message: "No delivery information found",
        },
        {
          headers: corsHeaders,
        }
      );
    }

    // Get first post office information
    const postOffice = postOfficeData[0];

    return data(
      {
        pincode,
        available: true,
        message: "Delivery available",
        postOffice: {
          name: postOffice.Name,
          branchType: postOffice.BranchType,
          deliveryStatus: postOffice.DeliveryStatus,
          district: postOffice.District,
          division: postOffice.Division,
          region: postOffice.Region,
          state: postOffice.State,
          country: postOffice.Country,
        },
      },
      {
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("India Post API error:", error);

    return data(
      {
        error: "Unable to check pincode. Please try again.",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
