import exifr from 'exifr';

export interface ExifResult {
  hasExifEdit: boolean;
  software: string | null;
  cameraMake: string | null;
  cameraModel: string | null;
  originalDate: string | null;
}

// Softwares de edição comuns — presença aqui não prova manipulação maliciosa,
// mas é um sinal relevante de que a imagem passou por processamento.
const EDITING_SOFTWARE_PATTERN = /photoshop|gimp|lightroom|snapseed|picsart|facetune|affinity/i;

/**
 * Extrai metadados EXIF de uma imagem e sinaliza se há indício de edição
 * (baseado no campo "Software" do próprio arquivo).
 */
export async function analyzeExif(buffer: Buffer): Promise<ExifResult> {
  try {
    const data = await exifr.parse(buffer, { pick: ['Software', 'Make', 'Model', 'DateTimeOriginal'] });

    if (!data) {
      return {
        hasExifEdit: false,
        software: null,
        cameraMake: null,
        cameraModel: null,
        originalDate: null,
      };
    }

    const software: string | null = data.Software ?? null;

    return {
      hasExifEdit: software ? EDITING_SOFTWARE_PATTERN.test(software) : false,
      software,
      cameraMake: data.Make ?? null,
      cameraModel: data.Model ?? null,
      originalDate: data.DateTimeOriginal ? new Date(data.DateTimeOriginal).toISOString() : null,
    };
  } catch (error) {
    console.error('Erro ao analisar EXIF:', error);
    return {
      hasExifEdit: false,
      software: null,
      cameraMake: null,
      cameraModel: null,
      originalDate: null,
    };
  }
}
