/*
 * Copyright (c) 2026 2259top-wq
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of 2259top-wq.
 * You shall not disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into with 2259top-wq.
 */

/* ==========================================
   Windows Server 2022 Tutorial Controller Script
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
  // --- State Variables ---
  let activeChapterIdx = 0;
  let activeSectionIdx = 0;
  
  // Quiz states
  let activeQuizChapterIdx = 0;
  let activeQuizQuestionIdx = 0;
  let quizAnswers = {}; // Map of "chapterIdx-questionIdx" -> selectedOptionIndex
  let currentGeneratedScript = ""; // Raw generated script for copying

  // --- Local Storage Initialization ---
  let checklistState = JSON.parse(localStorage.getItem("ws2022_checklist")) || {};
  let quizScores = JSON.parse(localStorage.getItem("ws2022_quiz_scores")) || {};
  let currentTheme = localStorage.getItem("ws2022_theme") || "dark-theme";

  // --- DOM Elements ---
  const body = document.body;
  const chapterList = document.getElementById("chapter-list");
  const themeSwitchBtn = document.getElementById("theme-switch");
  const breadcrumbsContainer = document.getElementById("breadcrumbs");
  
  // Views
  const viewTutorial = document.getElementById("view-tutorial");
  const viewPowerShell = document.getElementById("view-powershell-generator");
  const viewChecklist = document.getElementById("view-checklist");
  const viewQuizzes = document.getElementById("view-quizzes");
  
  // Sidebar Tool buttons
  const btnPowerShellGen = document.getElementById("btn-powershell-gen");
  const btnChecklist = document.getElementById("btn-checklist");
  const btnQuizAll = document.getElementById("btn-quiz-all");
  
  // Mobile Nav
  const mobileToggle = document.getElementById("mobile-toggle");
  const sidebar = document.querySelector(".sidebar");

  // Breadcrumbs elements
  const breadcrumbs = document.getElementById("breadcrumbs");

  // Toast
  const toast = document.getElementById("toast-notification");

  // --- Theme Initializer ---
  body.className = currentTheme;
  themeSwitchBtn.addEventListener("click", () => {
    if (body.classList.contains("dark-theme")) {
      body.classList.replace("dark-theme", "light-theme");
      localStorage.setItem("ws2022_theme", "light-theme");
    } else {
      body.classList.replace("light-theme", "dark-theme");
      localStorage.setItem("ws2022_theme", "dark-theme");
    }
  });

  // --- Sidebar Mobile Toggle ---
  mobileToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.toggle("active");
  });
  document.addEventListener("click", (e) => {
    if (!sidebar.contains(e.target) && e.target !== mobileToggle) {
      sidebar.classList.remove("active");
    }
  });

  // --- Lightweight Markdown Parser ---
  // --- Lightweight Markdown Parser ---
  function parseMarkdown(text) {
    // 1. Extract code blocks to placeholders to prevent splitting or styling inside them
    const codeBlocks = [];
    let html = text.replace(/```(powershell|bash|cmd|text|javascript)\r?\n([\s\S]*?)```/g, (match, lang, code) => {
      const escapedCode = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      
      let highlighted = escapedCode;
      if (lang === "powershell") {
        highlighted = highlightPowerShell(escapedCode);
      }

      const placeholder = `<!--CODE_BLOCK_${codeBlocks.length}-->`;
      codeBlocks.push(`<div class="code-block-wrapper">
        <button class="inner-copy-btn" onclick="copyCode(this)">
          <svg viewBox="0 0 24 24" width="12" height="12"><rect x="9" y="9" width="13" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a1.5 1.5 0 0 1-1.5-1.5V4a1.5 1.5 0 0 1 1.5-1.5h9a1.5 1.5 0 0 1 1.5 1.5v1" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          銴ˊ
        </button>
        <pre><code class="language-${lang}">${highlighted}</code></pre>
      </div>`);
      return placeholder;
    });

    // 2. Extract inline code to placeholders
    const inlineCodes = [];
    html = html.replace(/`([^`]+)`/g, (match, code) => {
      const placeholder = `<!--INLINE_CODE_${inlineCodes.length}-->`;
      inlineCodes.push(`<code>${code}</code>`);
      return placeholder;
    });

    // Helper to format inline tags (bold, links, etc.) inside text
    function formatInlineElements(str) {
      return str.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    }

    // 3. Process line by line to build blocks (headers, lists, blockquotes, paragraphs)
    const lines = html.split(/\r?\n/);
    const blocks = [];
    let currentBlock = null;

    lines.forEach(line => {
      const trimmedLine = line.trim();

      // Empty line closes the current list or blockquote or paragraph
      if (trimmedLine === '') {
        if (currentBlock) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        return;
      }

      // Headers
      if (trimmedLine.startsWith('### ')) {
        if (currentBlock) { blocks.push(currentBlock); currentBlock = null; }
        blocks.push({ type: 'h3', content: formatInlineElements(trimmedLine.substring(4)) });
        return;
      }
      if (trimmedLine.startsWith('## ')) {
        if (currentBlock) { blocks.push(currentBlock); currentBlock = null; }
        blocks.push({ type: 'h2', content: formatInlineElements(trimmedLine.substring(3)) });
        return;
      }

      // Blockquotes (both alert notes/tips and regular quotes)
      if (trimmedLine.startsWith('>')) {
        let content = line.substring(line.indexOf('>') + 1).trim();
        let alertType = null;
        const alertMatch = content.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING)\]/);
        if (alertMatch) {
          alertType = alertMatch[1];
          content = content.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING)\]/, '').trim();
        }

        if (currentBlock && currentBlock.type === 'blockquote') {
          currentBlock.lines.push(content);
        } else {
          if (currentBlock) { blocks.push(currentBlock); }
          currentBlock = { type: 'blockquote', alertType, lines: [content] };
        }
        return;
      }

      // Unordered lists (bullet points)
      const ulMatch = line.match(/^(\s*)[\*\-](?!\*)\s*(.*)$/);
      if (ulMatch) {
        const indent = ulMatch[1].length;
        const itemContent = formatInlineElements(ulMatch[2]);
        
        if (currentBlock && currentBlock.type === 'ul') {
          currentBlock.items.push({ indent, content: itemContent });
        } else {
          if (currentBlock) { blocks.push(currentBlock); }
          currentBlock = { type: 'ul', items: [{ indent, content: itemContent }] };
        }
        return;
      }

      // Ordered lists (numbered lists)
      const olMatch = line.match(/^(\s*)\d+\.\s*(.*)$/);
      if (olMatch) {
        const indent = olMatch[1].length;
        const itemContent = formatInlineElements(olMatch[2]);

        if (currentBlock && currentBlock.type === 'ol') {
          currentBlock.items.push({ indent, content: itemContent });
        } else {
          if (currentBlock) { blocks.push(currentBlock); }
          currentBlock = { type: 'ol', items: [{ indent, content: itemContent }] };
        }
        return;
      }

      // Regular paragraph text
      if (currentBlock && currentBlock.type === 'p') {
        currentBlock.lines.push(line);
      } else {
        if (currentBlock) { blocks.push(currentBlock); }
        currentBlock = { type: 'p', lines: [line] };
      }
    });

    if (currentBlock) {
      blocks.push(currentBlock);
    }

    // Render blocks to HTML
    let output = '';
    blocks.forEach(block => {
      if (block.type === 'h3') {
        output += `<h3>${block.content}</h3>\n`;
      } else if (block.type === 'h2') {
        output += `<h2>${block.content}</h2>\n`;
      } else if (block.type === 'blockquote') {
        const innerHTML = formatInlineElements(block.lines.join('<br>'));
        if (block.alertType) {
          output += `<blockquote><p><strong>[${block.alertType}]</strong> ${innerHTML}</p></blockquote>\n`;
        } else {
          output += `<blockquote><p>${innerHTML}</p></blockquote>\n`;
        }
      } else if (block.type === 'ul') {
        let listHTML = '<ul>\n';
        block.items.forEach(item => {
          listHTML += `  <li>${item.content}</li>\n`;
        });
        listHTML += '</ul>\n';
        output += listHTML;
      } else if (block.type === 'ol') {
        let listHTML = '<ol>\n';
        block.items.forEach(item => {
          listHTML += `  <li>${item.content}</li>\n`;
        });
        listHTML += '</ol>\n';
        output += listHTML;
      } else if (block.type === 'p') {
        const innerHTML = formatInlineElements(block.lines.join('<br>'));
        output += `<p>${innerHTML}</p>\n`;
      }
    });

    // 4. Restore inline code from placeholders
    inlineCodes.forEach((codeHTML, idx) => {
      output = output.replace(`<!--INLINE_CODE_${idx}-->`, codeHTML);
    });

    // 5. Restore code blocks from placeholders
    codeBlocks.forEach((codeHTML, idx) => {
      output = output.replace(`<!--CODE_BLOCK_${idx}-->`, codeHTML);
    });

    return output;
  }

  // Basic PowerShell highlighter helper
  function highlightPowerShell(code) {
    // Keywords
    const keywords = /\b(if|else|elseif|for|foreach|while|switch|return|param|function|try|catch|finally|throw|break|continue)\b/g;
    // Cmdlets: Verb-Noun
    const cmdlets = /\b([A-Z][a-z]+-[A-Z][A-Za-z0-9]+)\b/g;
    // Variables: $name
    const variables = /(\$[A-Za-z0-9_:]+)/g;
    // Strings: "..." or '...'
    const doubleStr = /("[^"]*")/g;
    const singleStr = /('[^']*')/g;
    // Comments: # ...
    const comments = /(#[^\r\n]*)/g;

    let res = code;
    // Run replacement safely
    res = res.replace(comments, '<span class="comment">$1</span>');
    // Don't highlight inside tags, so do strings next
    res = res.replace(doubleStr, '<span class="string">$1</span>');
    res = res.replace(singleStr, '<span class="string">$1</span>');
    res = res.replace(variables, '<span class="variable">$1</span>');
    res = res.replace(keywords, '<span class="keyword">$1</span>');
    res = res.replace(cmdlets, '<span class="command">$1</span>');

    return res;
  }

  // --- Copy Clipboard Alert ---
  window.copyCode = (button) => {
    const codeElement = button.nextElementSibling.querySelector("code");
    const textToCopy = codeElement.innerText;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast("隞?Ⅳ撌脰?鋆質?芾票蝪選?");
      button.innerText = "撌脰?鋆?;
      button.style.backgroundColor = "var(--accent-success)";
      button.style.color = "var(--text-dark)";
      
      setTimeout(() => {
        button.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12"><rect x="9" y="9" width="13" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a1.5 1.5 0 0 1-1.5-1.5V4a1.5 1.5 0 0 1 1.5-1.5h9a1.5 1.5 0 0 1 1.5 1.5v1" fill="none" stroke="currentColor" stroke-width="2"/></svg> 銴ˊ`;
        button.style.backgroundColor = "rgba(26, 34, 56, 0.8)";
        button.style.color = "var(--text-muted)";
      }, 2000);
    });
  };

  function showToast(msg) {
    toast.innerText = msg;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2000);
  }

  // --- Tab Control Router ---
  function switchView(viewName) {
    // Reset view visibility
    const views = [viewTutorial, viewPowerShell, viewChecklist, viewQuizzes];
    views.forEach(v => v.classList.remove("active"));
    
    // Reset sidebar btn styles
    const sidebarBtns = [btnPowerShellGen, btnChecklist, btnQuizAll];
    sidebarBtns.forEach(b => b.classList.remove("active"));

    // De-activate all section links in sidebar
    document.querySelectorAll(".nav-section-item").forEach(item => item.classList.remove("active"));

    if (viewName === "tutorial") {
      viewTutorial.classList.add("active");
      // Re-highlight active section link in sidebar
      const activeLink = document.querySelector(`.nav-section-link[data-chapter="${activeChapterIdx}"][data-section="${activeSectionIdx}"]`);
      if (activeLink) {
        activeLink.parentElement.classList.add("active");
      }
    } else if (viewName === "powershell") {
      viewPowerShell.classList.add("active");
      btnPowerShellGen.classList.add("active");
      breadcrumbs.innerHTML = `<span>撌亙</span> <span class="divider">/</span> <span class="active">PowerShell ?Ｙ???/span>`;
    } else if (viewName === "checklist") {
      viewChecklist.classList.add("active");
      btnChecklist.classList.add("active");
      breadcrumbs.innerHTML = `<span>撌亙</span> <span class="divider">/</span> <span class="active">撖血?閮剖?瑼Ｘ銵?/span>`;
      renderChecklistTab();
    } else if (viewName === "quizzes") {
      viewQuizzes.classList.add("active");
      btnQuizAll.classList.add("active");
      breadcrumbs.innerHTML = `<span>閰葫</span> <span class="divider">/</span> <span class="active">?芣?撖血?皜祇?</span>`;
      initQuizTab();
    }

    // Scroll to top
    document.getElementById("content-body").scrollTop = 0;
    sidebar.classList.remove("active"); // close mobile side menu
  }

  btnPowerShellGen.addEventListener("click", () => switchView("powershell"));
  btnChecklist.addEventListener("click", () => switchView("checklist"));
  btnQuizAll.addEventListener("click", () => switchView("quizzes"));

  // Widget Actions
  document.getElementById("widget-checklist-goto").addEventListener("click", () => switchView("checklist"));
  document.getElementById("widget-quiz-goto").addEventListener("click", () => {
    activeQuizChapterIdx = activeChapterIdx;
    switchView("quizzes");
    loadQuizQuestion(0);
  });

  // --- Render Sidebar Navigation Menu ---
  function initSidebarMenu() {
    chapterList.innerHTML = "";
    
    tutorialsData.forEach((ch, chIdx) => {
      const chapterLi = document.createElement("li");
      chapterLi.className = `nav-chapter ${chIdx === 0 ? "expanded" : ""}`;
      chapterLi.id = `nav-ch-${chIdx}`;

      const headerBtn = document.createElement("button");
      headerBtn.className = "nav-chapter-header";
      headerBtn.innerHTML = `
        <span>${ch.title}</span>
        <span class="chevron">??/span>
      `;

      headerBtn.addEventListener("click", () => {
        const isExpanded = chapterLi.classList.contains("expanded");
        // Collapse others (optional, let's keep simple accordian)
        document.querySelectorAll(".nav-chapter").forEach(node => {
          if (node !== chapterLi) node.classList.remove("expanded");
        });
        chapterLi.classList.toggle("expanded", !isExpanded);
      });

      const sectionUl = document.createElement("ul");
      sectionUl.className = "nav-sections-list";

      ch.sections.forEach((sec, secIdx) => {
        const secLi = document.createElement("li");
        secLi.className = "nav-section-item";
        if (chIdx === 0 && secIdx === 0) {
          secLi.classList.add("active");
        }

        const secLink = document.createElement("a");
        secLink.className = "nav-section-link";
        secLink.innerText = sec.title;
        secLink.dataset.chapter = chIdx;
        secLink.dataset.section = secIdx;

        secLink.addEventListener("click", (e) => {
          e.preventDefault();
          loadSection(chIdx, secIdx);
          switchView("tutorial");
        });

        secLi.appendChild(secLink);
        sectionUl.appendChild(secLi);
      });

      chapterLi.appendChild(headerBtn);
      chapterLi.appendChild(sectionUl);
      chapterList.appendChild(chapterLi);
    });
  }

  // --- Load and Render Section Content ---
  function loadSection(chapterIdx, sectionIdx) {
    activeChapterIdx = parseInt(chapterIdx);
    activeSectionIdx = parseInt(sectionIdx);

    const chapter = tutorialsData[activeChapterIdx];
    const section = chapter.sections[activeSectionIdx];

    // Update Hero elements
    document.getElementById("chapter-title").innerText = chapter.title;
    document.getElementById("chapter-desc").innerText = chapter.description;

    // Load dynamic markdown content
    const sectionsContainer = document.getElementById("article-sections-container");
    sectionsContainer.innerHTML = "";

    // Show current section as the main focused card, and list other sections in the chapter
    chapter.sections.forEach((sec, sIdx) => {
      const sectionNode = document.createElement("section");
      sectionNode.className = "tutorial-section";
      sectionNode.id = `sec-${activeChapterIdx}-${sIdx}`;

      const activeClass = sIdx === activeSectionIdx ? "card-glass active-section" : "card-glass";
      sectionNode.innerHTML = `
        <h2>${sec.title}</h2>
        <div class="${activeClass} section-content-card">
          ${parseMarkdown(sec.content)}
        </div>
      `;
      sectionsContainer.appendChild(sectionNode);
    });

    // Update active sidebar link
    document.querySelectorAll(".nav-section-item").forEach(node => node.classList.remove("active"));
    const link = document.querySelector(`.nav-section-link[data-chapter="${activeChapterIdx}"][data-section="${activeSectionIdx}"]`);
    if (link) {
      link.parentElement.classList.add("active");
      // Scroll sidebar into view if needed
      link.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    // Expand current chapter in sidebar, collapse others
    document.querySelectorAll(".nav-chapter").forEach((chNode, idx) => {
      chNode.classList.toggle("expanded", idx === activeChapterIdx);
    });

    // Update breadcrumbs
    breadcrumbs.innerHTML = `
      <span>擐?</span> <span class="divider">/</span> 
      <span>${chapter.title.split("嚗?)[0]}</span> <span class="divider">/</span> 
      <span class="active">${section.title}</span>
    `;

    // Render local widgets
    renderChapterWidgets();
    updateChapterNavigationButtons();
    updateReadingProgress();
  }

  // --- Render mini-widgets in the sidebar of tutorial view ---
  function renderChapterWidgets() {
    const chapter = tutorialsData[activeChapterIdx];
    
    // Checklist widget
    const checklistList = document.getElementById("widget-checklist-list");
    checklistList.innerHTML = "";

    const tasks = chapter.checklist;
    let completedCount = 0;

    tasks.forEach((task, idx) => {
      const li = document.createElement("li");
      const key = `${activeChapterIdx}-${idx}`;
      const isChecked = !!checklistState[key];
      
      li.className = isChecked ? "checked" : "unchecked";
      li.innerText = task;

      if (isChecked) completedCount++;

      // Click to toggle
      li.addEventListener("click", () => {
        checklistState[key] = !checklistState[key];
        localStorage.setItem("ws2022_checklist", JSON.stringify(checklistState));
        renderChapterWidgets();
        // Update general checklist if open
        if (viewChecklist.classList.contains("active")) {
          renderChecklistTab();
        }
      });

      checklistList.appendChild(li);
    });

    // Calculate percent
    const percent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
    document.getElementById("widget-checklist-progress").style.width = `${percent}%`;

    // Quiz score widget
    const scoreText = document.getElementById("widget-quiz-score-text");
    const highestScore = quizScores[activeChapterIdx];
    if (highestScore !== undefined) {
      const maxScore = chapter.quiz.length;
      scoreText.innerText = `?擃???${highestScore} / ${maxScore}`;
      scoreText.style.color = highestScore === maxScore ? "var(--accent-success)" : "var(--accent-secondary)";
    } else {
      scoreText.innerText = "撠皜祇?";
      scoreText.style.color = "var(--text-muted)";
    }
  }

  // --- Bottom page navigation ---
  function updateChapterNavigationButtons() {
    const btnPrev = document.getElementById("btn-prev-chapter");
    const btnNext = document.getElementById("btn-next-chapter");
    const prevText = document.getElementById("prev-chapter-name");
    const nextText = document.getElementById("next-chapter-name");

    // Previous Section/Chapter
    if (activeSectionIdx > 0) {
      btnPrev.classList.remove("hidden");
      prevText.innerText = tutorialsData[activeChapterIdx].sections[activeSectionIdx - 1].title;
      btnPrev.onclick = () => loadSection(activeChapterIdx, activeSectionIdx - 1);
    } else if (activeChapterIdx > 0) {
      btnPrev.classList.remove("hidden");
      const prevCh = tutorialsData[activeChapterIdx - 1];
      prevText.innerText = prevCh.sections[prevCh.sections.length - 1].title;
      btnPrev.onclick = () => loadSection(activeChapterIdx - 1, prevCh.sections.length - 1);
    } else {
      btnPrev.classList.add("hidden");
    }

    // Next Section/Chapter
    if (activeSectionIdx < tutorialsData[activeChapterIdx].sections.length - 1) {
      btnNext.classList.remove("hidden");
      nextText.innerText = tutorialsData[activeChapterIdx].sections[activeSectionIdx + 1].title;
      btnNext.onclick = () => loadSection(activeChapterIdx, activeSectionIdx + 1);
    } else if (activeChapterIdx < tutorialsData.length - 1) {
      btnNext.classList.remove("hidden");
      const nextCh = tutorialsData[activeChapterIdx + 1];
      nextText.innerText = nextCh.sections[0].title;
      btnNext.onclick = () => loadSection(activeChapterIdx + 1, 0);
    } else {
      btnNext.classList.add("hidden");
    }
  }

  // --- Reading Progress calculation ---
  function updateReadingProgress() {
    // Total sections
    let totalSections = 0;
    let currentProgress = 0;

    tutorialsData.forEach((ch, chIdx) => {
      ch.sections.forEach((sec, secIdx) => {
        totalSections++;
        if (chIdx < activeChapterIdx || (chIdx === activeChapterIdx && secIdx <= activeSectionIdx)) {
          currentProgress++;
        }
      });
    });

    const percent = Math.round((currentProgress / totalSections) * 100);
    document.getElementById("reading-progress").style.width = `${percent}%`;
    document.getElementById("progress-percent").innerText = `${percent}%`;
  }

  // --- PowerShell Script Generator Logic ---
  const psTaskSelect = document.getElementById("ps-task-select");
  const psDynamicInputs = document.getElementById("ps-dynamic-inputs");
  const generatedCodeContainer = document.getElementById("generated-code-container");
  const btnCopyGenerated = document.getElementById("btn-copy-generated");

  // Inputs schema mapping
  const psTemplates = {
    net_static_ip: {
      inputs: [
        { label: "銝餅??餉?迂 (New Computer Name)", id: "param_hostname", type: "text", default: "SRV-DC-01" },
        { label: "?? IP 雿? (Static IP)", id: "param_ip", type: "text", default: "192.168.10.10" },
        { label: "?身?? (Gateway IP)", id: "param_gateway", type: "text", default: "192.168.10.1" },
        { label: "銝餉? DNS 隡箸???(DNS Server)", id: "param_dns", type: "text", default: "192.168.10.10" }
      ],
      generate: (vals) => `# ==================================================
# 隞餃?嚗??湧?血?蝔梯?閮剖??? IP 雿?
# ==================================================

# 1. 霈?餉?迂 (???敺???
Write-Host "霈?餉?迂??'${vals.param_hostname}'..." -ForegroundColor Cyan
Rename-Computer -NewName "${vals.param_hostname}" -Force

# 2. ?芸?撠?桀????銝剔?撖阡?銋云蝬脣
$Adapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.HardwareInterface } | Select-Object -First 1

if ($Adapter) {
    $Index = $Adapter.InterfaceIndex
    Write-Host "?詨?蝬脣?迂嚗?($Adapter.Name) [Index: $Index]" -ForegroundColor Cyan
    
    # 蝘駁???雯??IP (?踹?銵?嚗?∪敹賜?航炊)
    Remove-NetIPAddress -InterfaceIndex $Index -Confirm:$false -ErrorAction SilentlyContinue
    Remove-NetRoute -InterfaceIndex $Index -Confirm:$false -ErrorAction SilentlyContinue
    
    # 閮剖??圈???IP
    New-NetIPAddress -InterfaceIndex $Index -IPAddress "${vals.param_ip}" -PrefixLength 24 -DefaultGateway "${vals.param_gateway}"
    
    # 閮剖? DNS 敹怠?隡箸???
    Set-DnsClientServerAddress -InterfaceIndex $Index -ServerAddresses ("${vals.param_dns}", "8.8.8.8")
    
    Write-Host "IP ?蔭??嚗撩?撠 5 蝘????隞亙??冽?餉?迂..." -ForegroundColor Green
    Start-Sleep -Seconds 5
    Restart-Computer
} else {
    Write-Error "?航炊嚗銝???????(Up) ?雯頝臬嚗?
}`
    },
    net_enable_rdp: {
      inputs: [
        { label: "?蝬脰楝撅斤?撽? (NLA) 隞亙?撘瑕??剁?", id: "param_nla", type: "select", options: [ { name: "??(摰?刻)", value: "1" }, { name: "??(?詨捆?頂蝯?", value: "0" } ] }
      ],
      generate: (vals) => `# ==================================================
# 隞餃?嚗翰???券?蝡舀???(RDP) ??
# ==================================================

Write-Host "??垢獢??..." -ForegroundColor Cyan
# 靽格 Registry ? RDP ??
Set-ItemProperty -Path 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server' -Name "fDenyTSConnections" -Value 0

# 閮剖? NLA (蝬脰楝撅斤?撽?)
Set-ItemProperty -Path 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server\\WinStations\\RDP-Tcp' -Name "UserAuthentication" -Value ${vals.param_nla}

# ??Windows Defender ?脩?葉? RDP ?亦?閬?
Write-Host "閮剖??脩??閮梢?蝡舀??Ｗ蝡?.." -ForegroundColor Cyan
Enable-NetFirewallRule -DisplayGroup "Remote Desktop"

Write-Host "?垢獢?? (RDP) ?蔭摰嚗?閮剝?? 3389?? -ForegroundColor Green`
    },
    ad_install_forest: {
      inputs: [
        { label: "AD 蝬脣? FQDN ?? (憒?lab.local)", id: "param_domain", type: "text", default: "corp.contoso.com" },
        { label: "蝬脣? NetBIOS ?迂", id: "param_netbios", type: "text", default: "CONTOSO" },
        { label: "DSRM ??璅∪?蝞∠??∪?蝣?, id: "param_dsrm", type: "text", default: "P@ssw0rd999" }
      ],
      generate: (vals) => `# ==================================================
# 隞餃?嚗憓?AD DS 璅寧頂 (?冽蝚砌???DC ?函蔡)
# ?酉嚗?隞文銵?蝟餌絞撠??憪?Promo 銝西????
# ==================================================

Write-Host "甇仿? 1: 摰? AD DS 閫?極??.." -ForegroundColor Cyan
Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools

Write-Host "甇仿? 2: ???箇雯??嗥? (DC) ?啣?璅寧頂..." -ForegroundColor Cyan
Import-Module ADDSDeployment

$SecurePassword = ConvertTo-SecureString "${vals.param_dsrm}" -AsPlainText -Force

Install-ADDSForest \`
  -CreateDnsDelegation:$false \
  -DatabasePath "C:\\Windows\\NTDS" \
  -DomainMode "WinThreshold" \
  -DomainName "${vals.param_domain}" \
  -DomainNetbiosName "${vals.param_netbios}" \
  -ForestMode "WinThreshold" \
  -InstallDns:$true \
  -LogPath "C:\\Windows\\NTDS" \
  -NoRebootOnCompletion:$false \
  -SysVolPath "C:\\Windows\\SYSVOL" \
  -SafeModeAdministratorPassword $SecurePassword \
  -Force:$true`
    },
    ad_create_ou_user: {
      inputs: [
        { label: "?格?蝯??桐? (OU) ?迂", id: "param_ou", type: "text", default: "SalesDepartment" },
        { label: "雿輻?董??蝔?(SamAccountName)", id: "param_user", type: "text", default: "tonystark" },
        { label: "雿輻????(DisplayName)", id: "param_display", type: "text", default: "Tony Stark" },
        { label: "?身?餃撖Ⅳ", id: "param_pass", type: "text", default: "Avengers2026!" }
      ],
      generate: (vals) => `# ==================================================
# 隞餃?嚗遣蝡?蝜雿?(OU) ?蝬脣?雿輻??
# ==================================================

# ???桀? Active Directory 蝬脣? Base DN
$DomainDN = (Get-ADDomain).DistinguishedName
$TargetOUPath = "OU=${vals.param_ou},$DomainDN"

# 1. 撱箇? OU
if (-not (Get-ADOrganizationalUnit -Filter "Name -eq '${vals.param_ou}'")) {
    Write-Host "撱箇?蝯??桐? (OU)嚗?{vals.param_ou}..." -ForegroundColor Cyan
    New-ADOrganizationalUnit -Name "${vals.param_ou}" -Path $DomainDN
} else {
    Write-Host "蝯??桐? '${vals.param_ou}' 撌脣??剁??仿?撱箇??? -ForegroundColor Yellow
}

# 2. 撱箇??唬蝙?刻蒂閮剖??餃?撥餈思耨?孵?蝣?
$SecurePass = ConvertTo-SecureString "${vals.param_pass}" -AsPlainText -Force
$UPNDomain = (Get-ADDomain).DNSRoot

Write-Host "撱箇?蝬脣?雿輻??${vals.param_user}..." -ForegroundColor Cyan
New-ADUser -Name "${vals.param_display}" \`
           -SamAccountName "${vals.param_user}" \`
           -UserPrincipalName "${vals.param_user}@$UPNDomain" \`
           -Path $TargetOUPath \`
           -AccountPassword $SecurePass \`
           -Enabled $true \`
           -ChangePasswordAtLogon $true

Write-Host "??撱箇?雿輻??${vals.param_display} (${vals.param_user})嚗? -ForegroundColor Green`
    },
    dns_set_forwarder: {
      inputs: [
        { label: "銝餉?憭頧?蝡?IP", id: "param_dns1", type: "text", default: "8.8.8.8" },
        { label: "甈∟?憭頧?蝡?IP", id: "param_dns2", type: "text", default: "1.1.1.1" }
      ],
      generate: (vals) => `# ==================================================
# 隞餃?嚗身摰璈?DNS 隡箸??其?憭 DNS 頧?蝡?
# ==================================================

Write-Host "閮剖? DNS 頧?蝡???${vals.param_dns1} ??${vals.param_dns2}..." -ForegroundColor Cyan
Set-DnsServerForwarder -IPAddress @("${vals.param_dns1}", "${vals.param_dns2}") -PassThru

Write-Host "DNS 頧?隡箸??刻身摰???" -ForegroundColor Green`
    },
    dhcp_create_scope: {
      inputs: [
        { label: "雿??蝔?(Scope Name)", id: "param_shcp_name", type: "text", default: "Office_LAN" },
        { label: "?潭韏瑕? IP (Start IP)", id: "param_dhcp_start", type: "text", default: "192.168.10.100" },
        { label: "?潭蝯? IP (End IP)", id: "param_dhcp_end", type: "text", default: "192.168.10.200" },
        { label: "摮雯頝舫蝵?(Subnet Mask)", id: "param_dhcp_mask", type: "text", default: "255.255.255.0" },
        { label: "?身?? (Gateway / Router)", id: "param_dhcp_gw", type: "text", default: "192.168.10.1" }
      ],
      generate: (vals) => `# ==================================================
# 隞餃?嚗憓?DHCP 雿???? Gateway/DNS ?
# ==================================================

# 閮? Scope ID (蝬脫挾霅蝣?
$IPParts = "${vals.param_dhcp_start}".Split('.')
$ScopeID = "$($IPParts[0]).$($IPParts[1]).$($IPParts[2]).0"

Write-Host "撱箇? DHCP 雿?? ${vals.param_shcp_name} [蝬脫挾: $ScopeID]..." -ForegroundColor Cyan
Add-DhcpServerv4Scope -Name "${vals.param_shcp_name}" \`
                       -StartRange "${vals.param_dhcp_start}" \`
                       -EndRange "${vals.param_dhcp_end}" \`
                       -SubnetMask "${vals.param_dhcp_mask}" \`
                       -State Active

Write-Host "閮剖? DHCP ?賊?? (003 Gateway ??006 ?祆? DNS)..." -ForegroundColor Cyan
# 閮剖? Option 003: 頝舐??
Set-DhcpServerv4OptionValue -ScopeId $ScopeID -OptionId 3 -Value "${vals.param_dhcp_gw}"

# ?芸????祆??箏? IP 雿 DNS ?晷蝯血恥?嗥垢
$LocalIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' -and -not $_.IPAddress.StartsWith('169.254') })[0].IPAddress
Set-DhcpServerv4OptionValue -ScopeId $ScopeID -OptionId 6 -Value $LocalIP

Write-Host "DHCP 雿??蝵格???撌脩???" -ForegroundColor Green`
    },
    fs_create_share: {
      inputs: [
        { label: "?曹澈蝤??迂 (SMB Share Name)", id: "param_share_name", type: "text", default: "HR-Documents" },
        { label: "?祆?撖阡?鞈?憭曇楝敺?, id: "param_local_path", type: "text", default: "D:\\Shares\\HR-Docs" },
        { label: "甈脫?鈭耨?嫘??神?乓? AD 蝢斤??迂", id: "param_share_group", type: "text", default: "GG-HR-Staff" }
      ],
      generate: (vals) => `# ==================================================
# 隞餃?嚗遣蝡?獢?刻??冗?身摰?NTFS 甈?
# ==================================================

# 1. 撱箇?撖阡??桅? (?乩?摮)
if (-not (Test-Path "${vals.param_local_path}")) {
    Write-Host "撱箇??祆??桅?嚗?{vals.param_local_path}..." -ForegroundColor Cyan
    New-Item -Path "${vals.param_local_path}" -ItemType Directory -Force
}

# 2. 撱箇? SMB ?曹澈鞈?嚗?鈭摰黎蝯??游????嗡?鈭箏?質???
Write-Host "?潔? Windows 瑼??梁?曹澈? '${vals.param_share_name}'..." -ForegroundColor Cyan
New-SmbShare -Name "${vals.param_share_name}" -Path "${vals.param_local_path}" -FullAccess "${vals.param_share_group}" -ReadAccess "Everyone"

# 3. 隤踵撖阡?鞈?憭曄? NTFS ACL嚗宏?斤匱?踵?梁移蝝唳??格??
Write-Host "憟 NTFS 甈?閬? (??蝯?${vals.param_share_group} 靽格甈?..." -ForegroundColor Cyan
$ACL = Get-Acl "${vals.param_local_path}"

# 撱箇?摮??批閬? (Modify 甈?嚗匱?輯???鞈?憭曉?瑼?)
$Rule = New-Object System.Security.AccessControl.FileSystemAccessRule("${vals.param_share_group}", "Modify", "ContainerInherit,ObjectInherit", "None", "Allow")
$ACL.SetAccessRule($Rule)

# 憟 ACL
Set-Acl "${vals.param_local_path}" $ACL

Write-Host "?曹澈?桅????冽扳???蝵格???" -ForegroundColor Green`
    },
    sec_add_firewall: {
      inputs: [
        { label: "閬????迂 (Firewall Rule Display Name)", id: "param_fw_name", type: "text", default: "Allow custom app port" },
        { label: "???楊??(Port)", id: "param_fw_port", type: "text", default: "8080" },
        { label: "蝬脰楝????", id: "param_fw_proto", type: "select", options: [ { name: "TCP", value: "TCP" }, { name: "UDP", value: "UDP" } ] }
      ],
      generate: (vals) => `# ==================================================
# 隞餃?嚗遣蝡蝡?怎??芾? TCP/UDP ??????
# ==================================================

Write-Host "?啣? Windows ?脤?摰?脩?蝡???.." -ForegroundColor Cyan
New-NetFirewallRule -Name "CustomAppRule_Port_${vals.param_fw_port}" \`
                    -DisplayName "${vals.param_fw_name}" \`
                    -Description "Allow inbound traffic on port ${vals.param_fw_port}" \`
                    -Direction Inbound \`
                    -LocalPort ${vals.param_fw_port} \`
                    -Protocol ${vals.param_fw_proto} \`
                    -Action Allow \`
                    -Profile Any

Write-Host "?脩???歇憟銝??喟???" -ForegroundColor Green`
    },
    backup_system_state: {
      inputs: [
        { label: "?遢?脣??格?瑽賭誨??(隢?敹‵?仿?蝟餌絞銋蝡??隞??嚗? E:)", id: "param_bk_vol", type: "text", default: "E:" }
      ],
      generate: (vals) => `# ==================================================
# 隞餃?嚗?鋆?隞質??脖蒂?瑁? System State 蝟餌絞???隞?
# ==================================================

# 1. 蝣箔?撌脣?鋆?Windows Server Backup 閫?
if (-not (Get-WindowsFeature -Name Windows-Server-Backup).Installed) {
    Write-Host "摰? Windows Server Backup 閫?..." -ForegroundColor Cyan
    Install-WindowsFeature -Name Windows-Server-Backup -IncludeManagementTools
}

# 2. ???瑁?蝟餌絞???隞?(DSRM 敺拙??D 鞈?摨怎??遢?詨?)
Write-Host "??蝟餌絞???隞踝??遢蝤???格???'${vals.param_bk_vol}'..." -ForegroundColor Cyan
wbadmin start systemstatebackup -backupTarget:${vals.param_bk_vol} -quiet`
    }
  };

  function renderGeneratorInputs() {
    const selectedTask = psTaskSelect.value;
    const config = psTemplates[selectedTask];
    
    psDynamicInputs.innerHTML = "";
    
    config.inputs.forEach(input => {
      const group = document.createElement("div");
      group.className = "form-group";
      
      const label = document.createElement("label");
      label.innerText = input.label;
      label.setAttribute("for", input.id);
      
      let inputEl;
      if (input.type === "select") {
        inputEl = document.createElement("select");
        inputEl.id = input.id;
        input.options.forEach(o => {
          const opt = document.createElement("option");
          opt.value = o.value;
          opt.innerText = o.name;
          inputEl.appendChild(opt);
        });
      } else {
        inputEl = document.createElement("input");
        inputEl.type = input.type;
        inputEl.id = input.id;
        inputEl.value = input.default || "";
      }
      
      // Update code output on change
      inputEl.addEventListener("input", updateGeneratedScript);
      inputEl.addEventListener("change", updateGeneratedScript);
      
      group.appendChild(label);
      group.appendChild(inputEl);
      psDynamicInputs.appendChild(group);
    });
    
    updateGeneratedScript();
  }

  function updateGeneratedScript() {
    const selectedTask = psTaskSelect.value;
    const config = psTemplates[selectedTask];
    
    // Gather variables
    const vals = {};
    config.inputs.forEach(input => {
      const el = document.getElementById(input.id);
      vals[input.id] = el ? el.value : "";
    });
    
    const script = config.generate(vals);
    currentGeneratedScript = script; // Save to state for easy copying

    const highlighted = highlightPowerShell(script);
    const lines = highlighted.split('\n');

    if (generatedCodeContainer) {
      generatedCodeContainer.innerHTML = lines.map((line, idx) => {
        return `<div class="editor-line">
          <span class="line-number">${idx + 1}</span>
          <pre><code class="language-powershell">${line || ' '}</code></pre>
        </div>`;
      }).join('');
    }
  }

  psTaskSelect.addEventListener("change", renderGeneratorInputs);

  // Copy Generated Button Handler
  btnCopyGenerated.addEventListener("click", () => {
    navigator.clipboard.writeText(currentGeneratedScript).then(() => {
      showToast("PowerShell ?單撌脰?鋆質?芾票蝪選?");
      btnCopyGenerated.querySelector("span").innerText = "撌脰?鋆踝?";
      setTimeout(() => {
        btnCopyGenerated.querySelector("span").innerText = "銴ˊ蝔?蝣?;
      }, 2000);
    });
  });

  // --- Setup Checklist Tab Logic ---
  function renderChecklistTab() {
    const listContainer = document.getElementById("checklist-chapters-list");
    listContainer.innerHTML = "";

    let totalTasks = 0;
    let totalChecked = 0;

    tutorialsData.forEach((ch, chIdx) => {
      const block = document.createElement("div");
      block.className = "checklist-chapter-block";
      
      // Count checked in this chapter
      let chTasksCount = ch.checklist.length;
      let chCheckedCount = 0;
      
      ch.checklist.forEach((_, tIdx) => {
        totalTasks++;
        if (checklistState[`${chIdx}-${tIdx}`]) {
          totalChecked++;
          chCheckedCount++;
        }
      });

      const titleNode = document.createElement("div");
      titleNode.className = "checklist-chapter-title";
      titleNode.innerHTML = `
        <span>${ch.title}</span>
        <span class="chapter-badge-count">撌脣??${chCheckedCount} / ${chTasksCount}</span>
      `;
      block.appendChild(titleNode);

      const itemsGrid = document.createElement("div");
      itemsGrid.className = "checklist-items-grid";

      ch.checklist.forEach((task, tIdx) => {
        const itemKey = `${chIdx}-${tIdx}`;
        const isChecked = !!checklistState[itemKey];

        const item = document.createElement("div");
        item.className = `checklist-item ${isChecked ? "checked" : ""}`;
        item.innerHTML = `
          <div class="checklist-checkbox"></div>
          <span class="checklist-item-text">${task}</span>
        `;

        item.addEventListener("click", () => {
          checklistState[itemKey] = !checklistState[itemKey];
          localStorage.setItem("ws2022_checklist", JSON.stringify(checklistState));
          
          // Re-render checklist and sync widget
          renderChecklistTab();
          renderChapterWidgets();
        });

        itemsGrid.appendChild(item);
      });

      block.appendChild(itemsGrid);
      listContainer.appendChild(block);
    });

    // Update global progress bar
    const ratio = totalTasks > 0 ? (totalChecked / totalTasks) : 0;
    const percent = Math.round(ratio * 100);

    document.getElementById("chk-overall-percent").innerText = `${percent}%`;
    document.getElementById("chk-overall-count").innerText = `撌脣???${totalChecked} / ${totalTasks} ?;
    document.getElementById("chk-overall-bar").style.width = `${percent}%`;
  }

  // --- Quiz Engine Tab Logic ---
  const quizChapterTabs = document.getElementById("quiz-chapter-tabs");
  const quizMainCard = document.getElementById("quiz-main-card");
  const quizChapterBadge = document.getElementById("quiz-chapter-badge");
  const quizQuestionNumber = document.getElementById("quiz-question-number");
  const quizQuestionText = document.getElementById("quiz-question-text");
  const quizOptionsList = document.getElementById("quiz-options-list");
  
  const quizFeedbackPanel = document.getElementById("quiz-feedback-panel");
  const quizFeedbackStatus = document.getElementById("quiz-feedback-status");
  const quizExplanationText = document.getElementById("quiz-explanation-text");
  
  const btnQuizNext = document.getElementById("btn-quiz-next");
  const btnQuizRestart = document.getElementById("btn-quiz-restart");

  function initQuizTab() {
    quizChapterTabs.innerHTML = "";
    
    tutorialsData.forEach((ch, chIdx) => {
      const tab = document.createElement("li");
      tab.className = `quiz-tab-item ${chIdx === activeQuizChapterIdx ? "active" : ""}`;
      tab.innerText = ch.title.split("嚗?)[0]; // Short title (e.g. 蝚砌?蝡?
      
      tab.addEventListener("click", () => {
        // Switch active quiz tab
        document.querySelectorAll(".quiz-tab-item").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        
        activeQuizChapterIdx = chIdx;
        loadQuizQuestion(0);
      });
      
      quizChapterTabs.appendChild(tab);
    });

    updateOverallQuizScores();
    loadQuizQuestion(0);
  }

  function loadQuizQuestion(questionIdx) {
    activeQuizQuestionIdx = questionIdx;
    const chapter = tutorialsData[activeQuizChapterIdx];
    const quiz = chapter.quiz[activeQuizQuestionIdx];
    
    // Clear panels
    quizFeedbackPanel.className = "quiz-feedback hidden";
    btnQuizNext.classList.add("hidden");
    btnQuizRestart.classList.add("hidden");

    // Badges & title
    quizChapterBadge.innerText = chapter.title.split("嚗?)[0];
    quizQuestionNumber.innerText = `蝚?${activeQuizQuestionIdx + 1} / ${chapter.quiz.length} 憿;
    quizQuestionText.innerText = quiz.question;

    quizOptionsList.innerHTML = "";
    const letters = ["A", "B", "C", "D"];

    quiz.options.forEach((opt, optIdx) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option-btn";
      btn.innerHTML = `
        <span class="option-letter">${letters[optIdx]}</span>
        <span>${opt}</span>
      `;

      // Check if this question was already answered during this session
      const sessionKey = `${activeQuizChapterIdx}-${activeQuizQuestionIdx}`;
      const hasAnswered = quizAnswers[sessionKey] !== undefined;

      if (hasAnswered) {
        btn.disabled = true;
        const answer = quizAnswers[sessionKey];
        if (optIdx === quiz.correct) {
          btn.classList.add("correct");
        } else if (optIdx === answer) {
          btn.classList.add("wrong");
        }
      } else {
        btn.addEventListener("click", () => gradeQuizOption(optIdx));
      }

      quizOptionsList.appendChild(btn);
    });

    // If already answered, show feedback panels
    const sessionKey = `${activeQuizChapterIdx}-${activeQuizQuestionIdx}`;
    if (quizAnswers[sessionKey] !== undefined) {
      showQuizFeedback(quizAnswers[sessionKey]);
    }
  }

  function gradeQuizOption(selectedIdx) {
    const sessionKey = `${activeQuizChapterIdx}-${activeQuizQuestionIdx}`;
    quizAnswers[sessionKey] = selectedIdx;

    // Disable all options
    document.querySelectorAll(".quiz-option-btn").forEach(btn => btn.disabled = true);

    // Show colors
    const chapter = tutorialsData[activeQuizChapterIdx];
    const quiz = chapter.quiz[activeQuizQuestionIdx];
    const options = quizOptionsList.children;

    if (selectedIdx === quiz.correct) {
      options[selectedIdx].classList.add("correct");
    } else {
      options[selectedIdx].classList.add("wrong");
      options[quiz.correct].classList.add("correct"); // Highlight correct one
    }

    showQuizFeedback(selectedIdx);
  }

  function showQuizFeedback(selectedIdx) {
    const chapter = tutorialsData[activeQuizChapterIdx];
    const quiz = chapter.quiz[activeQuizQuestionIdx];
    
    quizFeedbackPanel.classList.remove("hidden");
    
    const isCorrect = selectedIdx === quiz.correct;
    if (isCorrect) {
      quizFeedbackPanel.className = "quiz-feedback correct-feedback";
      quizFeedbackStatus.className = "feedback-status correct-text";
      quizFeedbackStatus.innerHTML = `<span class="status-icon">??/span> 蝑?鈭?`;
    } else {
      quizFeedbackPanel.className = "quiz-feedback wrong-feedback";
      quizFeedbackStatus.className = "feedback-status wrong-text";
      quizFeedbackStatus.innerHTML = `<span class="status-icon">??/span> 蝑鈭?..`;
    }

    quizExplanationText.innerText = quiz.explanation;

    // Navigation buttons
    if (activeQuizQuestionIdx < chapter.quiz.length - 1) {
      btnQuizNext.classList.remove("hidden");
      btnQuizNext.onclick = () => loadQuizQuestion(activeQuizQuestionIdx + 1);
    } else {
      // Quiz finished for this chapter, calculate final score
      calculateChapterQuizResult();
    }
  }

  function calculateChapterQuizResult() {
    const chapter = tutorialsData[activeQuizChapterIdx];
    let correctCount = 0;
    
    chapter.quiz.forEach((q, idx) => {
      const answer = quizAnswers[`${activeQuizChapterIdx}-${idx}`];
      if (answer === q.correct) correctCount++;
    });

    // Save highest score
    const prevHighest = quizScores[activeQuizChapterIdx] || 0;
    if (correctCount > prevHighest || quizScores[activeQuizChapterIdx] === undefined) {
      quizScores[activeQuizChapterIdx] = correctCount;
      localStorage.setItem("ws2022_quiz_scores", JSON.stringify(quizScores));
      updateOverallQuizScores();
      renderChapterWidgets(); // Sync tutorial side widget
    }

    btnQuizRestart.classList.remove("hidden");
    btnQuizRestart.innerText = `?皜祇? (${correctCount} / ${chapter.quiz.length})`;
    btnQuizRestart.onclick = () => {
      // Clear answers for this chapter
      chapter.quiz.forEach((_, idx) => {
        delete quizAnswers[`${activeQuizChapterIdx}-${idx}`];
      });
      loadQuizQuestion(0);
    };
  }

  function updateOverallQuizScores() {
    let totalQuestions = 0;
    let totalCorrect = 0;

    tutorialsData.forEach((ch, idx) => {
      totalQuestions += ch.quiz.length;
      totalCorrect += quizScores[idx] || 0;
    });

    document.getElementById("quiz-overall-ratio").innerText = `${totalCorrect} / ${totalQuestions}`;
  }

  // --- Real-time Fuzzy Search Logic ---
  const searchInput = document.getElementById("search-input");
  
  // Create search dropdown element in DOM
  const searchDropdown = document.createElement("div");
  searchDropdown.className = "search-results-dropdown hidden";
  document.querySelector(".search-box").appendChild(searchDropdown);

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
      searchDropdown.classList.add("hidden");
      searchDropdown.innerHTML = "";
      return;
    }

    const matches = [];
    
    tutorialsData.forEach((ch, chIdx) => {
      // Search in chapter title/description
      if (ch.title.toLowerCase().includes(query) || ch.description.toLowerCase().includes(query)) {
        matches.push({
          chapterIdx: chIdx,
          sectionIdx: 0,
          title: ch.title,
          text: ch.description,
          type: "chapter"
        });
      }

      // Search in sections
      ch.sections.forEach((sec, secIdx) => {
        const titleMatch = sec.title.toLowerCase().includes(query);
        const contentMatch = sec.content.toLowerCase().includes(query);

        if (titleMatch || contentMatch) {
          // Extract a snippet of content containing the search query
          let snippet = "";
          if (contentMatch) {
            const idx = sec.content.toLowerCase().indexOf(query);
            const start = Math.max(0, idx - 30);
            const end = Math.min(sec.content.length, idx + 40);
            snippet = (start > 0 ? "..." : "") + sec.content.substring(start, end).replace(/\r?\n/g, " ") + (end < sec.content.length ? "..." : "");
          } else {
            snippet = sec.title;
          }

          matches.push({
            chapterIdx: chIdx,
            sectionIdx: secIdx,
            title: sec.title,
            text: snippet,
            type: "section"
          });
        }
      });
    });

    // Render results
    renderSearchResults(matches);
  });

  function renderSearchResults(matches) {
    searchDropdown.innerHTML = "";
    
    if (matches.length === 0) {
      const emptyItem = document.createElement("div");
      emptyItem.className = "search-result-item";
      emptyItem.innerHTML = `<div style="color: var(--text-muted); text-align: center;">?曆??啁蝚衣???/div>`;
      searchDropdown.appendChild(emptyItem);
      searchDropdown.classList.remove("hidden");
      return;
    }

    // Limit to 8 matches
    matches.slice(0, 8).forEach(match => {
      const item = document.createElement("div");
      item.className = "search-result-item";
      item.innerHTML = `
        <div class="search-result-title">${match.title}</div>
        <div class="search-result-text">${match.text}</div>
      `;

      item.addEventListener("click", () => {
        loadSection(match.chapterIdx, match.sectionIdx);
        switchView("tutorial");
        searchDropdown.classList.add("hidden");
        searchInput.value = "";
      });

      searchDropdown.appendChild(item);
    });

    searchDropdown.classList.remove("hidden");
  }

  // Close search dropdown on click outside
  document.addEventListener("click", (e) => {
    if (!document.querySelector(".search-box").contains(e.target)) {
      searchDropdown.classList.add("hidden");
    }
  });


  // --- Initialize App ---
  initSidebarMenu();
  loadSection(0, 0); // Load Chapter 1, Section 1 by default
  renderGeneratorInputs(); // Initialise PowerShell settings form
});
