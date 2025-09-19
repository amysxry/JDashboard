<script setup>
import { ref, computed } from 'vue'; // <--- The Fix
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabaseClient';

const selectedFile = ref(null);
const uploadStatus = ref('');
const isUploading = ref(false);
const fileInput = ref(null);

const handleFileChange = (event) => {
  selectedFile.value = event.target.files[0];
};

const uploadExcel = async () => {
  if (!selectedFile.value) {
    uploadStatus.value = 'Por favor, selecciona un archivo.';
    return;
  }

  isUploading.value = true;
  uploadStatus.value = 'Procesando archivo...';
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      for (const sheetName of workbook.SheetNames) {
        // Asumimos que el nombre de la hoja es el ID del cliente
        const clientId = sheetName.trim();
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        // Limpiar datos antiguos del cliente antes de insertar los nuevos
        await supabase
          .from('seo_rankings')
          .delete()
          .eq('cliente_id', clientId);

        const seoRankingsToInsert = rows.map(row => ({
          cliente_id: clientId,
          keyword: row.keyword, // Campo de la tabla
          position: row.position,
          previous_position: row.previous_position,
          created_at: row.lastUpdate // Asume un formato de fecha compatible
        }));

        const { error: insertError } = await supabase
          .from('seo_rankings')
          .insert(seoRankingsToInsert);

        if (insertError) {
          throw new Error(`Error al insertar datos para el cliente ${clientId}: ${insertError.message}`);
        }
      }
      
      uploadStatus.value = '¡Datos actualizados con éxito!';
    } catch (error) {
      console.error(error);
      uploadStatus.value = `Error: ${error.message}`;
    } finally {
      isUploading.value = false;
      fileInput.value.value = '';
      selectedFile.value = null;
    }
  };
  reader.readAsArrayBuffer(selectedFile.value);
};

// Clase computada para el estado de la subida
const statusClass = computed(() => {
  if (uploadStatus.value.includes('éxito')) return 'success';
  if (uploadStatus.value.includes('Error')) return 'error';
  return 'info';
});
</script>

<style scoped>
.admin-panel-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.card {
  background-color: #1e1e1e;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  text-align: center;
  width: 100%;
  max-width: 500px;
}

.card h2 {
  font-size: 1.8rem;
  color: #fff;
  margin-bottom: 0.5rem;
}

.card p {
  color: #bbb;
  margin-bottom: 2rem;
}

.file-input {
  display: block;
  margin: 0 auto 1.5rem;
  color: #fff;
}

.upload-button {
  background-color: #92d000;
  color: #000;
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.upload-button:disabled {
  background-color: #555;
  cursor: not-allowed;
}

.upload-button:hover:enabled {
  background-color: #acd948;
}

.status {
  margin-top: 1rem;
  font-weight: bold;
}

.success {
  color: #92d000;
}

.error {
  color: #ff4d4d;
}

.info {
  color: #fff;
}
</style>