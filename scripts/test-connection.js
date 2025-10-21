const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://cdcjbxclolnoejzludzh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkY2pieGNsb2xub2Vqemx1ZHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NTk4NzEsImV4cCI6MjA3NjUzNTg3MX0.EZ7zS-4CaeDpcSfmKYn0Wi9RD8125dNsviuhpjl2Z3o'

console.log('🔗 Testing Supabase connection...')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Connection error:', error.message)
      return
    }
    
    console.log('✅ Supabase connection successful!')
    console.log('📊 Session data:', data)
    
    // Try to check if auth is working
    const { data: authData, error: authError } = await supabase.auth.getUser()
    
    if (authError && !authError.message.includes('session_not_found')) {
      console.error('❌ Auth error:', authError.message)
      return
    }
    
    console.log('✅ Auth service is working!')
    console.log('🎉 Ready to set up database schema')
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }
}

testConnection()