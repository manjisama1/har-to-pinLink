function copyAllLinks() {
    const textarea = document.getElementById('all-links');
    textarea.select();
    document.execCommand('copy');
    alert('All links copied to clipboard!');
}
