// 简化的视频处理脚本
let isProcessing = false;

// 检查文件类型
function isVideoFile(file) {
  return file.type.startsWith('video/');
}

function isAudioFile(file) {
  return file.type.startsWith('audio/');
}

// 显示错误信息
function showError(message) {
  const uploadArea = document.querySelector('.border-dashed');
  if (uploadArea) {
    uploadArea.innerHTML = `
      <div class="mx-auto flex max-w-lg flex-col gap-4">
        <div class="text-2xl">❌</div>
        <h2 class="text-2xl font-semibold text-error-dark">上传错误</h2>
        <p class="text-sm text-neutral-dark/80">${message}</p>
        <button
          type="button"
          id="tryAgainBtn"
          class="rounded-full bg-accent-dark px-6 py-3 text-sm font-semibold text-primary shadow hover:bg-accent transition-colors"
        >
          重试
        </button>
      </div>
    `;

    // 绑定重试按钮事件
    setTimeout(() => {
      const tryAgainBtn = document.getElementById('tryAgainBtn');
      if (tryAgainBtn) {
        tryAgainBtn.addEventListener('click', () => {
          location.reload();
        });
      }
    }, 0);
  }
}

// 显示处理中状态
function showProcessing(message) {
  const uploadArea = document.querySelector('.border-dashed');
  if (uploadArea) {
    uploadArea.innerHTML = `
      <div class="mx-auto flex max-w-lg flex-col gap-4">
        <div class="text-2xl animate-spin">⚙️</div>
        <h2 class="text-2xl font-semibold text-accent-dark">处理中...</h2>
        <p class="text-sm text-neutral-dark/80">${message}</p>
      </div>
    `;
  }
}

// 显示成功状态
function showSuccess(file, isExtracted = false) {
  const uploadArea = document.querySelector('.border-dashed');
  const extractedText = isExtracted ? '<br><span class="text-success-dark font-medium">🎵 从视频提取的音频</span>' : '';

  if (uploadArea) {
    uploadArea.innerHTML = `
      <div class="mx-auto flex max-w-lg flex-col gap-4">
        <div class="text-2xl">✅</div>
        <h2 class="text-2xl font-semibold text-success-dark">文件已准备好</h2>
        <p class="text-sm text-neutral-dark/80">
          <strong>${file.name}</strong><br>
          类型: ${file.type}<br>
          大小: ${(file.size / 1024 / 1024).toFixed(2)} MB${extractedText}
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            id="chooseDifferentBtn"
            class="flex-1 rounded-full bg-neutral-dark/20 px-4 py-2 text-sm font-semibold text-neutral-dark hover:bg-neutral-dark/30 transition-colors"
          >
            选择其他文件
          </button>
          <button
            type="button"
            id="startEditingBtn"
            class="flex-1 rounded-full bg-accent-dark px-4 py-2 text-sm font-semibold text-primary shadow hover:bg-accent transition-colors"
          >
            开始编辑
          </button>
        </div>
      </div>
    `;

    // 绑定按钮事件
    setTimeout(() => {
      const chooseDifferentBtn = document.getElementById('chooseDifferentBtn');
      const startEditingBtn = document.getElementById('startEditingBtn');

      if (chooseDifferentBtn) {
        chooseDifferentBtn.addEventListener('click', () => {
          document.getElementById('fileInput').click();
        });
      }

      if (startEditingBtn) {
        startEditingBtn.addEventListener('click', () => {
          // 显示编辑器区域
          const uploadSection = document.getElementById('uploadSection');
          const editorSection = document.getElementById('editorSection');

          if (uploadSection && editorSection) {
            uploadSection.style.display = 'none';
            editorSection.classList.remove('hidden');

            // 初始化React编辑器
            initReactEditor();
          }
        });
      }
    }, 0);
  }
}

// 简化的文件处理函数 - 暂时跳过FFmpeg
async function handleFileSelect(event) {
  console.log('📁 [Upload] 开始处理文件选择...');

  if (isProcessing) {
    console.log('⏸️ [Upload] 文件正在处理中，跳过本次选择');
    return;
  }

  const file = event.target.files[0];
  if (!file) {
    console.log('⚠️ [Upload] 没有选择文件');
    return;
  }

  console.log('📁 [Upload] 文件信息:', {
    name: file.name,
    type: file.type,
    size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    sizeBytes: file.size,
    lastModified: new Date(file.lastModified).toISOString()
  });

  // 检查文件类型
  const isAudio = isAudioFile(file);
  const isVideo = isVideoFile(file);
  console.log('📁 [Upload] 文件类型检查:', { isAudio, isVideo });

  if (!isAudio && !isVideo) {
    console.error('❌ [Upload] 不支持的文件类型:', file.type);
    showError('请选择音频或视频文件。');
    return;
  }

  // 检查原始文件大小（30MB限制）
  const maxSizeBytes = 30 * 1024 * 1024; // 30MB
  if (file.size > maxSizeBytes) {
    console.error('❌ [Upload] 文件超过大小限制:', {
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      maxSize: '30 MB'
    });
    showError(`文件大小 (${(file.size / 1024 / 1024).toFixed(2)} MB) 超过了 30MB 限制。`);
    return;
  }

  console.log('✅ [Upload] 文件验证通过，开始处理...');
  isProcessing = true;
  let finalFile = file;
  let isExtracted = false;

  try {
    // 如果是视频文件，暂时跳过音频提取，直接显示成功
    if (isVideo) {
      console.log('🎬 [Video] 检测到视频文件，显示处理中状态...');
      showProcessing('视频文件已上传，音频提取功能正在开发中...');

      // 模拟处理时间
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 创建一个模拟的音频文件用于演示
      const outputName = file.name.replace(/\.[^/.]+$/, ".mp3");
      finalFile = new File([new Blob(['mock audio data'], { type: 'audio/mpeg' })], outputName, { type: 'audio/mpeg' });
      isExtracted = true;
    } else {
      console.log('🎵 [Audio] 检测到音频文件，直接使用');
      showProcessing('音频文件处理中...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 存储文件供后续处理
    console.log('💾 [Upload] 保存文件到全局变量');
    window.currentAudioFile = finalFile;

    // 显示成功状态
    console.log('✅ [Upload] 文件处理完成，显示成功界面');
    showSuccess(finalFile, isExtracted);

  } catch (error) {
    console.error('❌ [Upload] 文件处理失败:', error);
    showError('文件处理失败，请重试。');
  } finally {
    console.log('🏁 [Upload] 文件处理流程结束');
    isProcessing = false;
  }
}

// 初始化事件监听器
document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }

  // Handle drag and drop
  const uploadArea = document.querySelector('.border-dashed');
  if (uploadArea) {
    uploadArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      this.classList.add('border-success-dark', 'bg-success-light/50');
      this.classList.remove('border-neutral-dark/20', 'bg-primary');
    });

    uploadArea.addEventListener('dragleave', function(e) {
      e.preventDefault();
      this.classList.remove('border-success-dark', 'bg-success-light/50');
      this.classList.add('border-neutral-dark/20', 'bg-primary');
    });

    uploadArea.addEventListener('drop', function(e) {
      e.preventDefault();
      this.classList.remove('border-success-dark', 'bg-success-light/50');
      this.classList.add('border-neutral-dark/20', 'bg-primary');

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
          fileInput.files = files;
          handleFileSelect({ target: { files: files } });
        }
      }
    });
  }
});

// 初始化React编辑器
function initReactEditor() {
  // 检查是否有可用的音频文件
  if (!window.currentAudioFile) {
    console.error('没有找到音频文件');
    alert('没有找到音频文件，请重新上传');
    return;
  }

  // 检查React和编辑器根元素
  const editorRoot = document.getElementById('audio-editor-root');
  if (!editorRoot) {
    console.error('没有找到编辑器根元素');
    return;
  }

  // 创建简单的返回按钮和编辑器界面
  const editorHTML = `
    <div class="min-h-screen bg-neutral-light p-4">
      <div class="max-w-6xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-neutral-dark">音频编辑器</h1>
            <p class="text-sm text-neutral-dark/70 mt-1">
              正在编辑: <span class="font-medium">${window.currentAudioFile.name}</span>
            </p>
          </div>
          <button
            onclick="returnToUpload()"
            class="px-4 py-2 text-sm font-medium text-neutral-dark hover:text-neutral-dark/80 transition-colors border border-neutral-dark/20 rounded-md"
          >
            ← 返回上传
          </button>
        </div>

        <div class="bg-primary rounded-lg border border-neutral-dark/20 p-6">
          <div class="text-center py-12">
            <div class="text-6xl mb-4">🎵</div>
            <h3 class="text-xl font-semibold text-success-dark mb-2">音频编辑器正在初始化...</h3>
            <p class="text-sm text-neutral-dark/70">
              完整的波形编辑器即将上线，目前可以预览音频文件信息
            </p>

            <div class="mt-6 max-w-md mx-auto text-left bg-neutral-light/50 rounded-lg p-4">
              <h4 class="font-medium text-neutral-dark mb-2">文件信息:</h4>
              <div class="text-sm text-neutral-dark/80 space-y-1">
                <div>文件名: ${window.currentAudioFile.name}</div>
                <div>类型: ${window.currentAudioFile.type}</div>
                <div>大小: ${(window.currentAudioFile.size / 1024 / 1024).toFixed(2)} MB</div>
                <div>最后修改: ${new Date(window.currentAudioFile.lastModified).toLocaleString()}</div>
              </div>
            </div>

            <div class="mt-6">
              <button
                onclick="downloadCurrentAudio()"
                class="px-6 py-2 bg-success-dark text-primary rounded-md hover:bg-success transition-colors mr-4"
              >
                下载音频文件
              </button>
              <button
                onclick="returnToUpload()"
                class="px-6 py-2 bg-neutral-dark/20 text-neutral-dark rounded-md hover:bg-neutral-dark/30 transition-colors"
              >
                重新选择文件
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  editorRoot.innerHTML = editorHTML;
}

// 返回上传页面
function returnToUpload() {
  const uploadSection = document.getElementById('uploadSection');
  const editorSection = document.getElementById('editorSection');

  if (uploadSection && editorSection) {
    uploadSection.style.display = 'block';
    editorSection.classList.add('hidden');
  }
}

// 下载当前音频文件
function downloadCurrentAudio() {
  if (!window.currentAudioFile) {
    alert('没有找到音频文件');
    return;
  }

  const url = URL.createObjectURL(window.currentAudioFile);
  const link = document.createElement('a');
  link.href = url;
  link.download = window.currentAudioFile.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}