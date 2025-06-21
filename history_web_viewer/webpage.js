const oneDayAgo = Date.now() - 1000 * 60 * 60 * 24;

chrome.history.search({
  text: '',
  startTime: oneDayAgo,
  maxResults: 100
}, function(results) {
  const list = document.getElementById('history-list');
  list.innerHTML = '';

  if (results.length === 0) {
    list.innerHTML = '<li>기록이 없습니다.</li>';
    return;
  }

  results.forEach(entry => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${entry.url}" target="_blank">${entry.title || entry.url}</a> (${entry.visitCount}회)`;
    list.appendChild(li);
  });
});