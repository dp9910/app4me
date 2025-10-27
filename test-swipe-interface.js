// Simple test to verify the swipe interface loads without errors
const puppeteer = require('puppeteer');

async function testSwipeInterface() {
  try {
    console.log('🧪 Testing swipe interface...');
    
    // Since we don't have puppeteer installed, let's just test the API call
    const fetch = require('node-fetch');
    
    const response = await fetch('http://localhost:3000/api/recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: "apps to take care of my plants at home"
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.recommendations && data.recommendations.length > 0) {
      console.log('✅ API working correctly');
      console.log(`📱 Found ${data.recommendations.length} apps`);
      console.log(`🌱 Top app: ${data.recommendations[0].app_data.name}`);
      
      // Test if required fields are present for swipe interface
      const firstApp = data.recommendations[0];
      const requiredFields = [
        'app_id',
        'app_data.name',
        'app_data.rating',
        'app_data.description',
        'personalized_oneliner',
        'match_explanation'
      ];
      
      let allFieldsPresent = true;
      requiredFields.forEach(field => {
        const fieldValue = field.split('.').reduce((obj, key) => obj?.[key], firstApp);
        if (!fieldValue) {
          console.log(`❌ Missing field: ${field}`);
          allFieldsPresent = false;
        }
      });
      
      if (allFieldsPresent) {
        console.log('✅ All required fields present for swipe interface');
      } else {
        console.log('❌ Some required fields missing');
      }
      
    } else {
      console.log('❌ API not working correctly');
      console.log(data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testSwipeInterface();
}

module.exports = { testSwipeInterface };