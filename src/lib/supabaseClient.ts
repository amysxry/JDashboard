import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ushtbjupwrfrfdzpisho.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaHRianVwd3JmcmZkenBpc2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MTIyMDEsImV4cCI6MjA2NDQ4ODIwMX0.00qqapy2B4dMSi7iHvbVw66bUE-92p9CMJbFTKNd-eY'

export const supabase = createClient(supabaseUrl, supabaseKey)
