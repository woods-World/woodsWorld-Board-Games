var showFuture = false,		// with this set to false, the future table and bulleted list will not show at all
showWIP = false,
showJumpOnDesktop = true,	// the jump-to button is mostly unneeded on the desktop version, so this is just for debugging
isMobile = window.matchMedia("(max-width: 768px)").matches && window.matchMedia("(pointer: coarse)").matches,
wipMessage = "<span class=\"wip\">(Not yet shipped: either a preorder, or a crowdfunded work in progress)</span> ",
sortColumn = "name",
sortOneColAttributes = ["name", "version", "category", "gameplayType", "tags", "complexity", "lastPlayed", "storageLocation", "description", "notes"],
sortTwoColAttributes = ["minPlayers", "maxPlayers", "minTime", "maxTime"],
sortTag = "",
allTags = [],
tagsByGame = {},
sortKeyword = "",
keywordCounts = {},
keywordsByGame = {},
sortAscending = true,
keywordDelim = /[\s,\.;'"\(\)]+/,
keywordIncludeDelim = /([\s,\.;'"\(\)]+)/g,
columnHeaders = {
	"name": "Name",
	"version": "Version",
	"description": "Description",
	"category": "Category",
	"gameplayType": "Gameplay",
	"tags": "Tags",
	"minPlayers": "Min",
	"maxPlayers": "Max",
	"minTime": "Min",
	"maxTime": "Max",
	"complexity": "Complexity",
	"lastPlayed": "Last Played",
	"storageLocation": "Stored In",
	"notes": "Notes"
},
mobileLabels = {},
categoryClasses = {
	"Board Game": "boardgame",
	"Card Game": "cardgame",
	"Competitive": "competitive",
	"Cooperative": "cooperative",
	"Competitive/Cooperative": "comp_coop",
	"Team-Competitive": "team_comp"
}
upArrow = "&nbsp;<span class=\"sort_arrow\">&#x25B2;</span>",
downArrow = "&nbsp;<span class=\"sort_arrow\">&#x25BC;</span>",
indentArrow = "<span class=\"indent_arrow\">&rdca;</span>&nbsp;";

var encodeEntities = function(str) {
	return str.replace(
		/<a\b[^>]*>.*?<\/a\s*>|&(?![#\w]+;)|[<>"']/gis,
		match => {
			if (/^<a\b/i.test(match)) {
				return match;
			}

			return {
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;'
			}[match];
		}
	);
};

var sortGames = function() {
	var secondColumn = (sortColumn == "name" ? "version" : "name"),
	thirdColumn = (sortColumn != "name" && sortColumn != "version" ? "version" : "complexity");
	boardGames.sort(function(a, b) {
		var aCol = a[sortColumn],
		aWip = (a.wip ? wipMessage : ""),
		aSecond = a[secondColumn],
		aThird = a[thirdColumn],
		bCol = b[sortColumn],
		bWip = (b.wip ? wipMessage : ""),
		bSecond = b[secondColumn],
		bThird = a[thirdColumn],
		ascendingFactor = (sortAscending ? -1 : 1);
		
		if (sortColumn == "version" && showWIP) {
			aCol = (aWip ? "A" : "B") + aCol;
			bCol = (bWip ? "A" : "B") + bCol;
		}
		
		if (sortColumn == "tags") {
			aCol = (tagsByGame[a.name + a.version].indexOf(sortTag) > -1 ? 0 : 1);
			bCol = (tagsByGame[b.name + b.version].indexOf(sortTag) > -1 ? 0 : 1);
		}
		
		if (sortColumn == "description") {
			aCol = (keywordsByGame[a.name + a.version].indexOf(sortKeyword) > -1 ? 0 : 1);
			bCol = (keywordsByGame[b.name + b.version].indexOf(sortKeyword) > -1 ? 0 : 1);
		}
		
		if (aCol < bCol) {
			return ascendingFactor;
		} else if (aCol > bCol) {
			return ascendingFactor * -1;
		} else {
			if (aSecond < bSecond) {
				return -1;
			} else if (aSecond > bSecond) {
				return 1;
			} else {
				if (aThird < bThird) {
					return -1;
				} else if (aThird > bThird) {
					return 1;
				} else {
					return 0;
				}
			}
		}
	});
};

var generateHeaders = function(filterObj) {
	var filterStr = [],
	inequalityLabels = {
		"equal": " equal to ",
		"less": " less than or equal to ",
		"greater": " greater than or equal to "
	};
	for (var column in filterObj) {
		if (column == "minPlayers") {
			filterStr.push("<b>Minimum players</b> <span class=\"filter_value\">" + inequalityLabels[filterObj.minPlayers.state] + filterObj.minPlayers.value + "</span>");
		} else if (column == "maxPlayers") {
			filterStr.push("<b>Maximum players</b> <span class=\"filter_value\">" + inequalityLabels[filterObj.maxPlayers.state] + filterObj.maxPlayers.value + "</span>");
		} else if (column == "minTime") {
			filterStr.push("<b>Minimum time</b> <span class=\"filter_value\">" + inequalityLabels[filterObj.minTime.state] + filterObj.minTime.value + "</span>");
		} else if (column == "maxTime") {
			filterStr.push("<b>Maximum time</b> <span class=\"filter_value\">" + inequalityLabels[filterObj.maxTime.state] + filterObj.maxTime.value + "</span>");
		} else if (column == "minComp") {
			filterStr.push("<b>Minimum complexity</b> is " + "<span class=\"filter_value\">" + filterObj.minComp + "</span>");
		} else if (column == "maxComp") {
			filterStr.push("<b>Maximum complexity</b> is " + "<span class=\"filter_value\">" + filterObj.maxComp + "</span>");
		} else {
			for (var f = 0; f < filterObj[column].length; f++) {
				var currFilter = filterObj[column][f];
				
				filterStr.push("<b>" + columnHeaders[column] + "</b> " + (currFilter.state == "include" ? "includes &quot;" : "excludes &quot;") + "<span class=\"filter_value\">" + currFilter.value + "</span>&quot;");
			}
		}
	}
	
	var jumpButton = "<button type=\"button\" onclick=\"populateJumpModal()\">Jump To...</button>",
	firstHeaderRow = "<thead class=\"headers\"><tr><th class=\"controls\" colspan=\"15\"><button type=\"button\" onclick=\"toggleWIP(this)\">WIP</button>&nbsp;<button type=\"button\" onclick=\"showModal('filter_window')\">Filters</button>"+(showJumpOnDesktop ? "&nbsp;" + jumpButton : "")+"<div id=\"filter_summary\">"+(filterStr.length > 0 ? filterStr.join(", ") : "")+"</div></th></tr><tr><th rowspan=\"2\"></th>",
	secondHeaderRow = "<tr>";
	
	if (isMobile) {
		return "<thead class=\"headers\"><tr><th class=\"controls\" colspan=\"2\"><button type=\"button\" onclick=\"toggleWIP(this)\">WIP</button>&nbsp;<button type=\"button\" onclick=\"showModal('filter_window')\">Filters</button>&nbsp;"+jumpButton+"<div id=\"filter_summary\">"+(filterStr.length > 0 ? filterStr.join(", ") : "")+"</div></th></tr></thead>"
	} else {
		for (var h = 0; h < sortOneColAttributes.length; h++) {
			var currHeader = sortOneColAttributes[h],
			properName = columnHeaders[currHeader],
			headerClasses = [];
			if (currHeader == sortColumn) {
				headerClasses.push("sorting_column");
			}
			if (currHeader == "complexity") {
				properName = "<span class=\"hastitle\" title=\"According to boardgamegeek.com\">Complexity</span>";
			}
			var headerCell = "<th" + (headerClasses.length > 0 ? " class=\""+headerClasses.join(" ")+"\"" : "") + " rowspan=\"2\" onclick=\"changeSort('"+currHeader+"')\">" + properName;
			
			if (currHeader == sortColumn) {
				if (sortColumn == "tags") {
					headerCell += "<br>[" + sortTag + "]";
				} else if (sortColumn == "description") {
					headerCell += "<br>\"" + sortKeyword + "\"";
				}
				
				if (sortAscending) {
					headerCell += upArrow;
				} else {
					headerCell += downArrow;
				}
			}
			
			headerCell += "</th>";
			firstHeaderRow += headerCell;
			
			if (currHeader == "tags") {
				firstHeaderRow += "<th class=\"two_col\" colspan=\"2\">Players</th><th class=\"two_col\" colspan=\"2\">Time</th>";
			}
		}
		firstHeaderRow += "</tr>";
		
		for (var i = 0; i < sortTwoColAttributes.length; i++) {
			var currHeader = sortTwoColAttributes[i],
			properName = columnHeaders[currHeader],
			headerCell = "<th" + (currHeader == sortColumn ? " class=\"sorting_column\"" : "") + " onclick=\"changeSort('"+currHeader+"')\">" + properName;
			
			if (currHeader == sortColumn) {
				if (sortAscending) {
					headerCell += upArrow;
				} else {
					headerCell += downArrow;
				}
			}
			
			headerCell += "</th>";
			secondHeaderRow += headerCell;
		}
		secondHeaderRow += "</tr></thead>";
		
		return firstHeaderRow + secondHeaderRow;
	}
};

var generateMobileLabels = function() {
	var columns = ["name", "version", "category", "gameplayType", "tags", "complexity", "minPlayers", "maxPlayers", "minTime", "maxTime", "lastPlayed", "storageLocation", "description", "notes"];
		
	for (var c = 0; c < columns.length; c++) {
		var currHeader = columns[c],
		properName = columnHeaders[currHeader],
		headerClasses = ["mobile_labels"];
		if (currHeader == sortColumn) {
			headerClasses.push("sorting_column");
		}
		if (currHeader == "complexity") {
			properName = "<span class=\"hastitle\" title=\"According to boardgamegeek.com\">Complexity</span>";
		}
		var headerCell = "<span" + (headerClasses.length > 0 ? " class=\""+headerClasses.join(" ")+"\"" : "") + " onclick=\"changeSort('"+currHeader+"')\">" + properName;
		
		if (currHeader == sortColumn) {
			if (sortColumn == "tags") {
				headerCell += "&nbsp;[" + sortTag + "]";
			} else if (sortColumn == "description") {
				headerCell += "&nbsp;\"" + sortKeyword + "\"";
			}
			
			if (sortAscending) {
				headerCell += upArrow;
			} else {
				headerCell += downArrow;
			}
		}
		headerCell += "</span>: ";
		mobileLabels[currHeader] = headerCell;
	}
	//console.log(JSON.stringify(mobileLabels, null, "\t"));
};

var changeSort = function(newSortCol) {
	if (newSortCol == "tags") {
		populateTagModal(-1, -1);
	} else if (newSortCol == "description") {
		populateKeywordModal();
	} else {
		sortTag = "";
		
		if (newSortCol == sortColumn) {
			sortAscending = !sortAscending;
		} else {
			sortColumn = newSortCol;
			sortAscending = true;
		}
		
		generateOwnedTable();
		setURLTargets();
	}
};

var changeSortTag = function(newSortTag) {
	sortColumn = "tags";
	
	if (sortTag == newSortTag) {
		sortAscending = !sortAscending;
	} else {
		sortTag = newSortTag;
		sortAscending = true;
	}
	
	generateOwnedTable();
	setURLTargets();
	populateTagModal(-1, -1);
};

var populateKeywordModal = function() {
	var keywordDiv = document.getElementById("keyword_container"),
	keywordSpans = [],
	lineLength = 0,
	allKeywords = Object.keys(keywordCounts).sort();
	
	for (var k = 0; k < allKeywords.length; k++) {
		var currKeyword = allKeywords[k],
		formattedKeyword = currKeyword;
		
		lineLength += currKeyword.length + keywordCounts[currKeyword];
		if (sortKeyword == currKeyword) {
			formattedKeyword = "<b>" + currKeyword + (sortAscending ? upArrow : downArrow) + "</b>";
		}
		var keySpan = "",
		fontSize = 13 + keywordCounts[currKeyword];
		
		if (lineLength >= (isMobile ? 40 : 120)) {
			keySpan = "<br>";
			lineLength = 0;
		}
		keySpan += "<span class=\"keyword\" onclick=\"changeSortKeyword('"+currKeyword+"')\" style=\"font-size: "+fontSize+"px\">"+formattedKeyword+"</span>";
		
		keywordSpans.push(keySpan);
	}
	
	keywordDiv.innerHTML = keywordSpans.join("&nbsp;");
	
	showModal("keyword_window");

	var mainElement = document.getElementById("main");
	mainElement.classList.add("no_scroll");
};

var changeSortKeyword = function(newSortKey) {
	sortColumn = "description";
	
	if (sortKeyword == newSortKey) {
		sortAscending = !sortAscending;
	} else {
		sortKeyword = newSortKey;
		sortAscending = true;
	}
	
	populateKeywordModal();
	generateOwnedTable();
	setURLTargets();
};

var populateTagModal = function(gameIndex, expansionIndex) {
	var tagLabel = document.getElementById("tag_label"),
	tagTable = document.getElementById("tag_table");
	
	// gameIndex is -1 if the modal is just displaying all tags and the user is picking one to sort on; 0 or above is displaying the tags for the game (or expansion) at that index
	if (gameIndex == -1) {
		var tagRows = [];
		if (allTags.length == 0) {
			tagLabel.innerHTML = "No tags to sort on";
		} else {
			tagLabel.innerHTML = "Sort on which tag?";
		}
		
		for (var t = 0; t < allTags.length; t++) {
			var formattedTag = allTags[t].replaceAll("'", "&#39;"),
			arrow = "";
			if (sortColumn == "tags" && sortTag == allTags[t]) {
				arrow = (sortAscending ? upArrow : downArrow);
			}
			
			var currTag = "<tr><td class=\"highlight_element\" onclick=\"changeSortTag('"+formattedTag+"')\">" + formattedTag + arrow + "</td></tr>";
			
			tagRows.push(currTag);
		}
		
		tagRows.sort();
		tagTable.innerHTML = tagRows.join("");
	} else {
		var currGame = {},
		tagRows = [];
		
		if (expansionIndex > -1) {
			currGame = boardGames[gameIndex].expansions[expansionIndex];
		} else {
			currGame = boardGames[gameIndex];
		}
		var gameName = encodeEntities((currGame.name != "" ? currGame.name : boardGames[gameIndex].name)),
		lastWord = gameName.split(" ").pop();
		
		gameName = (gameName + (expansionIndex > -1 && lastWord != "Expansion" ? " Expansion" : "")).trim();
		tagLabel.innerHTML = "Tags for " + (currGame.url != "" ? "<a href=\""+currGame.url+"\">"+gameName+"</a>" : gameName);
		
		for (var t = 0; t < currGame.tags.length; t++) {
			var formattedTag = currGame.tags[t].replaceAll("'", "&#39;"),
			currTag = "<tr><td>" + formattedTag + "</td></tr>";
			
			tagRows.push(currTag);
		}
		
		tagRows.sort();
		tagTable.innerHTML = tagRows.join("");
		setURLTargets();
	}
	
	showModal("tag_window");

	var mainElement = document.getElementById("main");
	mainElement.classList.add("no_scroll");
};

var showModal = function(modalId) {
	var modalElement = document.getElementById(modalId);
	modalElement.classList.remove("not_shown");
}

var hideModal = function(modalId) {
	var modalElement = document.getElementById(modalId),
	mainElement = document.getElementById("main");
	
	modalElement.classList.add("not_shown");
	mainElement.classList.remove("no_scroll");
};

var countTags = function() {
	for (var g = 0; g < boardGames.length; g++) {
		var currGame = boardGames[g];
		
		tagsByGame[currGame.name + currGame.version] = [];
		
		for (var t = 0; t < currGame.tags.length; t++) {
			var currTag = currGame.tags[t];
			
			if (allTags.indexOf(currTag) == -1) {
				allTags.push(currTag);
			}
			
			tagsByGame[currGame.name + currGame.version].push(currTag);
		}
		
		if (currGame.expansions.length > 0) {
			for (var e = 0; e < currGame.expansions.length; e++) {
				var currExpansion = currGame.expansions[e];
				
				for (var t = 0; t < currExpansion.tags.length; t++) {
					var currTag = currExpansion.tags[t];
					
					if (allTags.indexOf(currTag) == -1) {
						allTags.push(currTag);
					}
					
					if (tagsByGame[currGame.name + currGame.version].indexOf(currTag) == -1) {
						tagsByGame[currGame.name + currGame.version].push(currTag);
					}
				}
			}
		}
	}
	
	allTags.sort();
};

var countKeywords = function() {
	var excludedWords = ["a", "an", "the", "on", "for", "can", "with", "and", "from", "by", "to", "in", "s", "about", "as", "are", "is", "be", "do", "else", "go", "has", "have", "how", "if", "into", "of", "or", "re", "that", "they", "their", "then", "them", "those", "you", "your"];
	
	for (var g = 0; g < boardGames.length; g++) {
		var currGame = boardGames[g],
		descWords = currGame.description.toLowerCase().split(keywordDelim);
		
		keywordsByGame[currGame.name + currGame.version] = [];
		
		for (var w = 0; w < descWords.length; w++) {
			var currWord = descWords[w];
			
			if (excludedWords.indexOf(currWord) == -1) {
				if (keywordCounts[currWord] == null) {
					keywordCounts[currWord] = 1;
				} else {
					keywordCounts[currWord]++;
				}
			}
			
			if (keywordsByGame[currGame.name + currGame.version].indexOf(currWord) == -1)
				keywordsByGame[currGame.name + currGame.version].push(currWord);
		}
		
		if (currGame.expansions.length > 0) {
			for (var e = 0; e < currGame.expansions.length; e++) {
				var currExpansion = currGame.expansions[e],
				expWords = currExpansion.description.toLowerCase().split(keywordDelim);
				
				for (var x = 0; x < expWords.length; x++) {
					var currExWord = expWords[x];
					
					if (excludedWords.indexOf(currExWord) == -1) {
						if (keywordCounts[currExWord] == null) {
							keywordCounts[currExWord] = 1;
						} else {
							keywordCounts[currExWord]++;
						}
					}
					
					if (keywordsByGame[currGame.name + currGame.version].indexOf(currExWord) == -1)
						keywordsByGame[currGame.name + currGame.version].push(currExWord);
				}
			}
		}
	}
	
	//console.log(JSON.stringify(keywordCounts, null, "\t"));
};

var loadPage = function() {
	countTags();
	countKeywords();
	
	var futureDiv = document.getElementById("future_div");
	if (showFuture) {
		futureDiv.classList.remove("not_shown");
	} else {
		futureDiv.classList.add("not_shown");
	}
	
	generateFilters();
	generateTables();
	calcHeaderHeights();
};

var calcHeaderHeights = function() {
	if (isMobile) {
		// The mobile version of this page only has one sticky header, so these variables shouldn't even be used. But just in case,
		// to keep things compliant and avoid errors, they are defined with values here anyway
		document.documentElement.style.setProperty(
			'--header-row-height',
			`0px`
		);

		document.documentElement.style.setProperty(
			'--header-row-height-total',
			`0px`
		);
	} else {
		const gameTable = document.querySelector('#games'),
		headerRows = document.querySelectorAll('.headers tr'),
		row1Height = headerRows[0].offsetHeight,
		row2Height = headerRows[1].offsetHeight;

		document.documentElement.style.setProperty(
			'--header-row-height',
			`${row1Height}px`
		);

		document.documentElement.style.setProperty(
			'--header-row-height-total',
			`${row1Height + row2Height}px`
		);
	}
};

var highlightKeywords = function(gameDesc) {
	var delimCapture = new RegExp(keywordIncludeDelim),
	keywordRegex = new RegExp("^" + sortKeyword + "$", "i"),
	descSegments = gameDesc.split(delimCapture);
	
	//console.log(JSON.stringify(descSegments));
	
	// the keyword delimiters splitting up the description are every odd-number-indexed entry
	for (var s = 0; s < descSegments.length; s++) {
		if (keywordRegex.test(descSegments[s])) {
			// is bold the markup I want to go with?
			descSegments[s] = "<span class=\"keyword_match\">" + descSegments[s] + "</span>";
		}
	}
	
	return descSegments.join("");
};

var generateTables = function() {
	generateOwnedTable();
	if (showFuture) {
		generateFutureTable();
	}
	
	getDiscordList();
	setURLTargets();
};

var generateOwnedRow = function(currGame, rowNum, gameIndex, expansionIndex) {
	var gameName = (currGame.name != "" ? encodeEntities(currGame.name) : "Expansion"),
	gameLink = (currGame.url != "" ? "<a href=\""+currGame.url+"\">"+gameName+"</a>" : gameName),
	gameVersion = (currGame.wip ? wipMessage : "") + encodeEntities(currGame.version),
	gameCategory = formatCategory(currGame.category),
	gameType = formatGameplay(currGame.gameplayType),
	minNote = (currGame.numPlayersNote[0] != "" ? "<span class=\"hastitle\" title=\""+currGame.numPlayersNote[0]+"\">*</span>" : ""),
	maxNote = (currGame.numPlayersNote[1] != "" ? "<span class=\"hastitle\" title=\""+currGame.numPlayersNote[1]+"\">*</span>" : ""),
	tagStr = (sortColumn == "tags" && currGame.tags.indexOf(sortTag) > -1 ? sortTag : "&hellip;"),
	tagSpan = (currGame.tags.length > 0 ? "<span class=\""+(isMobile ? "mobile " : "")+"highlight_element\" onclick=\"populateTagModal("+gameIndex+", "+expansionIndex+")\">["+tagStr+"]</span>" : ""),
	tagCell = (currGame.tags.length > 0 ? "<td class=\""+(isMobile ? "mobile " : "")+"highlight_element\" onclick=\"populateTagModal("+gameIndex+", "+expansionIndex+")\">["+tagStr+"]</td>" : "<td></td>"),
	descCell = (sortColumn == "description" ? highlightKeywords(encodeEntities(currGame.description)) : encodeEntities(currGame.description)),
	rowClasses = [],
	newRow = "";
	
	if (rowNum % 2 == 1)
		rowClasses.push("shadedrow");
	if (expansionIndex > -1) {
		rowClasses.push("expansionrow");
	} else {
		rowClasses.push("gamerow");
	}
	
	if (isMobile) {
		// mobile row
		var rowTable = "<table class=\"mobile_entry\"><tr><td class=\"mobile\" colspan=\"3\""+(expansionIndex > -1 ? " class=\"indented\">" + indentArrow : ">")+mobileLabels["name"]+gameLink+"</td><td class=\"mobile\" rowspan=\"2\">"+mobileLabels["category"]+gameCategory+"</td></tr><tr><td class=\"mobile\" colspan=\"3\">"+mobileLabels["version"]+gameVersion+"</td></tr><tr><td class=\"mobile\">"+mobileLabels["gameplayType"]+gameType+"</td><td class=\"mobile\" colspan=\"2\">"+mobileLabels["tags"]+tagSpan+"</td><td class=\"mobile centered\">"+mobileLabels["complexity"]+currGame.complexity.toFixed(2)+"</td></tr><tr><td class=\"mobile mobile_labels\" colspan=\"2\">Players</td><td class=\"mobile mobile_labels\" colspan=\"2\">Time</td></tr><tr><td class=\"mobile centered\">"+mobileLabels["minPlayers"]+currGame.minPlayers+minNote+"</td><td class=\"mobile centered\">"+mobileLabels["maxPlayers"]+currGame.maxPlayers+maxNote+"</td><td class=\"mobile centered\">"+mobileLabels["minTime"]+currGame.minTime+"</td><td class=\"mobile centered\">"+mobileLabels["maxTime"]+currGame.maxTime+"</td></tr><tr><td colspan=\"2\" class=\"mobile centered\">"+mobileLabels["lastPlayed"]+encodeEntities(currGame.lastPlayed)+"</td><td colspan=\"2\" class=\"mobile centered\">"+mobileLabels["storageLocation"]+currGame.storageLocation+"</td></tr><tr><td class=\"mobile\" colspan=\"4\">"+mobileLabels["description"]+descCell+"</td></tr><tr><td class=\"mobile\" colspan=\"4\">"+mobileLabels["notes"]+encodeEntities(currGame.notes)+"</td></tr></table>";
		
		newRow = "<tr id=\"row"+rowNum+"\""+(rowClasses.length > 0 ? " class=\""+rowClasses.join(" ")+"\"" : "")+"><td>"+rowNum+"</td><td>"+rowTable+"</td></tr>";
	} else {
		// desktop row
		newRow = "<tr id=\"row"+rowNum+"\""+(rowClasses.length > 0 ? " class=\""+rowClasses.join(" ")+"\"" : "")+"><td>"+rowNum+"</td><td"+(expansionIndex > -1 ? " class=\"indented\">" + indentArrow : ">")+gameLink+"</td><td>"+gameVersion+"</td><td>"+gameCategory+"</td><td>"+gameType+"</td>"+tagCell+"<td class=\"centered\">"+currGame.minPlayers+minNote+"</td><td class=\"centered\">"+currGame.maxPlayers+maxNote+"</td><td class=\"centered\">"+currGame.minTime+"</td><td class=\"centered\">"+currGame.maxTime+"</td><td class=\"centered\">"+currGame.complexity.toFixed(2)+"</td><td class=\"centered\">"+encodeEntities(currGame.lastPlayed)+"</td><td class=\"centered\">"+currGame.storageLocation+"</td><td>"+descCell+"</td><td>"+encodeEntities(currGame.notes)+"</td></tr>";
	}
	
	return newRow;
};

var gamePassesFilter = function(gameObj, filterObj) {
	var rangeColRegex = /((min)|(max))((Players)|(Time))/;
	
	for (var column in filterObj) {
		if (column == "minComp" && gameObj.complexity < filterObj.minComp) {
			return false;
		} else if (column == "maxComp" && gameObj.complexity > filterObj.maxComp) {
			return false;
		} else if (rangeColRegex.test(column)) {
			if ((filterObj[column].state == "equal" && gameObj[column] != filterObj[column].value) ||
			(filterObj[column].state == "less" && gameObj[column] > filterObj[column].value) ||
			(filterObj[column].state == "greater" && gameObj[column] < filterObj[column].value))
				return false;
		} else {
			for (var f = 0; f < filterObj[column].length; f++) {
				var currFilter = filterObj[column][f];
				
				if (column == "tags") {
					// if there is a match but you're excluding that value
					if (gameObj.tags.indexOf(currFilter.value) > -1 && currFilter.state == "exclude") {
						return false;
					}
					// if there is no match but you're including that value
					if (gameObj.tags.indexOf(currFilter.value) == -1 && currFilter.state == "include") {
						return false;
					}
				} else {
					// if there is a match but you're excluding that value
					if (gameObj[column] == currFilter.value && currFilter.state == "exclude") {
						return false;
					}
					// if there is no match but you're including that value
					if (gameObj[column] != currFilter.value && currFilter.state == "include") {
						return false;
					}
				}
			}
			
		}
	}
	return true;
};

var generateOwnedTable = function() {
	sortGames();
	generateMobileLabels();
	
	var filterObj = getFilterObj(),
	gamesTable = document.getElementById("games"),
	tableRows = [generateHeaders(filterObj)],
	gameCount = 1;
	
	for (var g = 0; g < boardGames.length; g++) {
		var currGame = boardGames[g];
		
		if (!currGame.wip || showWIP) {
			if (gamePassesFilter(currGame, filterObj)) {
				var newRow = generateOwnedRow(currGame, gameCount, g, -1);
				
				tableRows.push(newRow);
				gameCount++;
			}
			
			if (currGame.expansions.length > 0) {
				for (var e = 0; e < currGame.expansions.length; e++) {
					var currExpansion = currGame.expansions[e];
					
					if (gamePassesFilter(currExpansion, filterObj) && (!currExpansion.wip || showWIP)) {
						var newRow = generateOwnedRow(currExpansion, gameCount, g, e);
				
						tableRows.push(newRow);
						gameCount++;
					}
				}
			}
		}
	}
	
	gamesTable.innerHTML = tableRows.join("");
	calcHeaderHeights();
};

var generateFutureTable = function() {
	var futureTable = document.getElementById("future_purchases"),
	futureRows = ["<thead><tr class=\"headers\"><th>Name</th><th>Players</th><th>Gameplay Type</th><th>Description</th><th>Price</th><th>Official Website</th></tr></thead>"];
	
	undecidedPurchases.sort(function(a, b) {
		if (a.name < b.name)
			return -1;
		else if (a.name > b.name)
			return 1;
		else
			return 0;
	});
	for (var f = 0; f < undecidedPurchases.length; f++) {
		var futureGame = undecidedPurchases[f],
		futureLink = (futureGame.officialWebsite != "" ? "<a href=\""+futureGame.officialWebsite+"\">Here</a>" : ""),
		newFuture = "<tr><td><a href=\""+futureGame.url+"\">"+futureGame.name+"</a></td><td>"+futureGame.players+"</td><td>"+futureGame.gameplayType+"</td><td>"+futureGame.description+"</td><td>"+futureGame.price+"</td><td>"+futureLink+"</td></tr>";
		
		futureRows.push(newFuture);
	}
	
	futureTable.innerHTML = futureRows.join("");
};

var gameNameList = function() {
	var gameNames = [];

	for (var g = 0; g < boardGames.length; g++) {
		var currGame = boardGames[g];
		gameNames.push(currGame.name);
		
		// if the name is the same as the previous entry
		if (g > 0 && gameNames[g - 1] == gameNames[g]) {
			gameNames[g - 1] += ", " + boardGames[g - 1].version;
			gameNames[g] += ", " + currGame.version;
		}
	}
	
	return gameNames;
};

var populateJumpModal = function() {
	var rowSelect = document.getElementById("row_menu"),
	rowNum = 1,
	options = ["<option value=\"\">-- Choose a game --</option>"],
	gameNames = gameNameList(),
	filterObj = getFilterObj();
	
	for (var g = 0; g < boardGames.length; g++) {
		var currGame = boardGames[g],
		properName = gameNames[g],
		newOption = "<option value=\"row"+(rowNum)+"\">"+(rowNum)+") "+properName+(currGame.wip ? " (WIP)" : "")+"</option>";
		
		if (!currGame.wip || showWIP) {
			if (gamePassesFilter(currGame, filterObj)) {
				options.push(newOption);
				rowNum++;
			}
			
			for (var e = 0; e < currGame.expansions.length; e++) {
				var currExpansion = currGame.expansions[e],
				expName = "&rdca; " + (currExpansion.name == "" ? currGame.name + " Expansion" : currExpansion.name),
				lastWord = expName.split(" ").pop();
				
				expName = (expName + (lastWord != "Expansion" ? " Expansion" : "")).trim();
				
				if (gamePassesFilter(currExpansion, filterObj) && (!currExpansion.wip || showWIP)) {
					newOption = "<option value=\"row"+(rowNum)+"\">"+(rowNum)+") "+expName+(currExpansion.wip ? " (WIP)" : "")+"</option>";
					options.push(newOption);
					rowNum++;
				}
			}
		}
	}
	
	rowSelect.innerHTML = options.join("");
	rowSelect.selectedIndex = 0;
	
	showModal("jump_window");
};

var jumpTo = function(location) {
	if (location == "top") {
		var gameTable = document.getElementById("games"),
		scrollOptions = {"block": "start"};
		
		gameTable.scrollIntoView(scrollOptions);
	} else if (location == "bottom") {
		var gameTable = document.getElementById("games"),
		scrollOptions = {"block": "end"};
		
		gameTable.scrollIntoView(scrollOptions);
	} else if (location == "row") {
		var rowSelect = document.getElementById("row_menu"),
		selectValue = rowSelect.options[rowSelect.selectedIndex].value;
		if (selectValue != "") {
			var rowElement = document.getElementById(selectValue),
			rowTop = rowElement.getBoundingClientRect().top + window.scrollY,
			header = document.querySelector("thead"),
			headerHeight = header.getBoundingClientRect().height,
			scrollLocation = rowTop - headerHeight;
			
			console.log(selectValue + ", scroll Y: " + scrollLocation);
			window.scrollTo({
				top: scrollLocation
			});
		}
	}
	
	var jumpModal = document.getElementById("jump_window");
	jumpModal.classList.add("not_shown");
};

var generateFilters = function() {
	var filterTable = document.getElementById("filter_table"),
	tableHtml = "",
	filterValues = {
		versions: [],
		categories: [],
		gameplays: [],
		tags: [],
		playerBounds: {},
		timeBounds: {},
		complexityBounds: {},
		lastPlayeds: [],
		storedIns: []
	}
	versionList = [],
	categoryList = [],
	gameplayList = [],
	tagList = [],
	playerRange = "",
	timeRange = "",
	complexityRange = "",
	lastPlayedList = [],
	storedInList = [],
	collectValues = function(game) {
		if (filterValues.versions.indexOf(game.version) == -1) {
			filterValues.versions.push(game.version);
		}
		if (filterValues.categories.indexOf(game.category) == -1) {
			filterValues.categories.push(game.category);
		}
		if (filterValues.gameplays.indexOf(game.gameplayType) == -1) {
			filterValues.gameplays.push(game.gameplayType);
		}
		for (var t = 0; t < game.tags.length; t++) {
			if (filterValues.tags.indexOf(game.tags[t]) == -1) {
				filterValues.tags.push(game.tags[t]);
			}
		}
		if (filterValues.lastPlayeds.indexOf(game.lastPlayed) == -1) {
			filterValues.lastPlayeds.push(game.lastPlayed);
		}
		if (filterValues.storedIns.indexOf(game.storageLocation) == -1) {
			filterValues.storedIns.push(game.storageLocation);
		}
		
		if (filterValues.playerBounds["min"] == null || filterValues.playerBounds["min"] > game.minPlayers) {
			filterValues.playerBounds["min"] = game.minPlayers;
		}
		if (filterValues.playerBounds["max"] == null || filterValues.playerBounds["max"] < game.maxPlayers) {
			filterValues.playerBounds["max"] = game.maxPlayers;
		}
		if (filterValues.timeBounds["min"] == null || filterValues.timeBounds["min"] > game.minTime) {
			filterValues.timeBounds["min"] = game.minTime;
		}
		if (filterValues.timeBounds["max"] == null || filterValues.timeBounds["max"] < game.maxTime) {
			filterValues.timeBounds["max"] = game.maxTime;
		}
		if (filterValues.complexityBounds["min"] == null || filterValues.complexityBounds["min"] > game.complexity) {
			filterValues.complexityBounds["min"] = game.complexity;
		}
		if (filterValues.complexityBounds["max"] == null || filterValues.complexityBounds["max"] < game.complexity) {
			filterValues.complexityBounds["max"] = game.complexity;
		}
	};
	
	for (var g = 0; g < boardGames.length; g++) {
		var currGame = boardGames[g];
		
		collectValues(currGame);
		
		for (var e = 0; e < currGame.expansions.length; e++) {
			var currExpansion = currGame.expansions[e];
			
			collectValues(currExpansion);
		}
	}
	//console.log(JSON.stringify(filterValues, null, "\t"));
	
	playerRange = "<b>Min</b>: <button type=\"button\" class=\"range-toggle\" title=\"Equal to\" data-column=\"minPlayers\" data-state=\"equal\" onclick=\"cycleRange(this)\">&equals;</button>&nbsp;<input type=\"number\" class=\"num_input\" id=\"minPlayers_filter\" placeholder=\""+filterValues.playerBounds.min+"\">&nbsp;<b>Max</b>: <button type=\"button\" class=\"range-toggle\" title=\"Equal to\" data-column=\"maxPlayers\" data-state=\"equal\" onclick=\"cycleRange(this)\">&equals;</button>&nbsp;<input type=\"number\" class=\"num_input\" id=\"maxPlayers_filter\" placeholder=\""+filterValues.playerBounds.max+"\">";
	timeRange = "<b>Min</b>: <button type=\"button\" class=\"range-toggle\" title=\"Equal to\" data-column=\"minTime\" data-state=\"equal\" onclick=\"cycleRange(this)\">&equals;</button>&nbsp;<input type=\"number\" class=\"num_input\" id=\"minTime_filter\" placeholder=\""+filterValues.timeBounds.min+"\">&nbsp;<b>Max</b>: <button type=\"button\" class=\"range-toggle\" title=\"Equal to\" data-column=\"maxTime\" data-state=\"equal\" onclick=\"cycleRange(this)\">&equals;</button>&nbsp;<input type=\"number\" class=\"num_input\" id=\"maxTime_filter\" placeholder=\""+filterValues.timeBounds.max+"\">";
	complexityRange = "<b>Min</b>: <input type=\"number\" class=\"num_input\" id=\"minComp_filter\" placeholder=\""+filterValues.complexityBounds.min+"\">&nbsp;<b>Max</b>: <input type=\"number\" class=\"num_input\" id=\"maxComp_filter\" placeholder=\""+filterValues.complexityBounds.max+"\">";
	
	// version filter: list of all values
	filterValues.versions.sort();
	for (var v = 0; v < filterValues.versions.length; v++) {
		var currVersion = filterValues.versions[v];
		
		versionList.push(filterButton("version", currVersion));
	}
	// category filter: list of all values
	filterValues.categories.sort();
	for (var c = 0; c < filterValues.categories.length; c++) {
		var currCategory = filterValues.categories[c];
		
		categoryList.push(filterButton("category", currCategory));
	}
	// gameplay filter: list of all values
	filterValues.gameplays.sort();
	for (var g = 0; g < filterValues.gameplays.length; g++) {
		var currGameplay = filterValues.gameplays[g];
		
		gameplayList.push(filterButton("gameplayType", currGameplay));
	}
	// tag filter: list of all values
	filterValues.tags.sort();
	for (var t = 0; t < filterValues.tags.length; t++) {
		var currTag = filterValues.tags[t];
		
		tagList.push(filterButton("tags", currTag));
	}
	
	// last played filter: list of all values
	filterValues.lastPlayeds.sort();
	for (var l = 0; l < filterValues.lastPlayeds.length; l++) {
		var currLast = filterValues.lastPlayeds[l];
		
		lastPlayedList.push(filterButton("lastPlayed", currLast));
	}
	// stored in filter: list of all values
	filterValues.storedIns.sort();
	for (var s = 0; s < filterValues.storedIns.length; s++) {
		var currStored = filterValues.storedIns[s];
		
		storedInList.push(filterButton("storageLocation", currStored));
	}
	
	if (isMobile) {
		// structure on mobile
		tableHtml += "<tr><td><b>Versions</b><br>" + versionList.join("&nbsp;") + "</td></tr>";
		tableHtml += "<tr><td><b>Categories</b><br>" + categoryList.join("&nbsp;") + "</td></tr>";
		tableHtml += "<tr><td><b>Gameplay Types</b><br>" + gameplayList.join("&nbsp;") + "</td></tr>";
		tableHtml += "<tr><td><b>Tags</b><br>" + tagList.join("&nbsp;") + "</td></tr>";
		tableHtml += "<tr><td><b>Players</b><br>" + playerRange + "</td></tr>";
		tableHtml += "<tr><td><b>Time</b><br>" + timeRange + "</td></tr>";
		tableHtml += "<tr><td><b>Complexity</b><br>" + complexityRange + "</td></tr>";
		tableHtml += "<tr><td><b>Last Played</b><br>" + lastPlayedList.join("&nbsp;") + "</td></tr>";
		tableHtml += "<tr><td><b>Stored In</b><br>" + storedInList.join("&nbsp;") + "</td></tr>";
	} else {
		// structure on desktop
		tableHtml += "<tr><td><b>Versions</b><br>" + versionList.join("&nbsp;") + "</td></tr>";
		tableHtml += "<tr><td><b>Categories</b><br>" + categoryList.join("&nbsp;") + "</td></tr>";
		tableHtml += "<tr><td><b>Gameplay Types</b><br>" + gameplayList.join("&nbsp;") + "</td></tr>";
		tableHtml += "<tr><td><b>Tags</b><br>" + tagList.join("&nbsp;") + "</td></tr>";
		tableHtml += "<tr><td><b>Players</b><br>" + playerRange + "</td></tr>";
		tableHtml += "<tr><td><b>Time</b><br>" + timeRange + "</td></tr>";
		tableHtml += "<tr><td><b>Complexity</b><br>" + complexityRange + "</td></tr>";
		tableHtml += "<tr><td><b>Last Played</b><br>" + lastPlayedList.join("&nbsp;") + "</td></tr>";
		tableHtml += "<tr><td><b>Stored In</b><br>" + storedInList.join("&nbsp;") + "</td></tr>";
	}
	
	filterTable.innerHTML = tableHtml;
};

var filterButton = function(column, value) {
	return "<button type=\"button\" class=\"filter-toggle\" title=\"Don't care\" data-column=\""+column+"\" data-value=\""+value+"\" data-state=\"ignore\" onclick=\"cycleFilter(this)\">"+(value == "" ? "(no value)" : value)+"</button>";
};

var cycleFilter = function(button) {
	const states = ["ignore", "include", "exclude"],
	stateTitles = {
		"ignore": "Don't care",
		"include": "Include",
		"exclude": "Exclude"
	};

	let current = button.dataset.state;
	let next = states[(states.indexOf(current) + 1) % states.length];

	button.dataset.state = next;
	button.title = stateTitles[next];
};

var cycleRange = function(button) {
	const states = ["equal", "less", "greater"],
	stateLabels = {
		"equal": "&equals;",
		"less": "&le;",
		"greater": "&ge;"
	},
	stateTitles = {
		"equal": "Equal to",
		"less": "Less than or equal to",
		"greater": "Greater than or equal to"
	};

	let current = button.dataset.state;
	let next = states[(states.indexOf(current) + 1) % states.length];

	button.dataset.state = next;
	button.innerHTML = stateLabels[next];
	button.title = stateTitles[next];
};

var resetFilters = function() {
	//var filterTable = document.getElementById("filter_table");
	document.querySelectorAll(".filter-toggle").forEach(button => {
		button.dataset.state = "ignore";
	});
	document.querySelectorAll(".range-toggle").forEach(button => {
		button.dataset.state = "equal";
	});
	var rangeColumns = ["Players", "Time", "Comp"];
	for (var c = 0; c < rangeColumns.length; c++) {
		var minInput = document.getElementById("min" + rangeColumns[c] + "_filter"),
		maxInput = document.getElementById("max" + rangeColumns[c] + "_filter");
		
		minInput.value = "";
		maxInput.value = "";
	}
};

var getFilterObj = function() {
	const filters = {};

	document.querySelectorAll(".filter-toggle").forEach(button => {
		const state = button.dataset.state;

		if (state === "ignore")
			return;

		const column = button.dataset.column;
		const value = button.dataset.value;

		if (!filters[column])
			filters[column] = [];

		filters[column].push({
			value: value,
			state: state
		});
	});
	
	document.querySelectorAll(".range-toggle").forEach(button => {
		const state = button.dataset.state,
		column = button.dataset.column,
		inputBox = document.getElementById(column + "_filter");
		
		if (inputBox.value != "") {
			const value = Number(inputBox.value);
			
			filters[column] = {
				value: value,
				state: state
			};
		}
	});
	
	var minCompInput = document.getElementById("minComp_filter"),
	maxCompInput = document.getElementById("maxComp_filter");
	if (minCompInput.value != "") {
		filters["minComp"] = Number(minCompInput.value);
	}
	if (maxCompInput.value != "") {
		filters["maxComp"] = Number(maxCompInput.value);
	}
	
	//console.log(JSON.stringify(filters, null, "\t"));
	return filters;
};

var applyFilters = function() {
	generateOwnedTable();
	setURLTargets();
	
	hideModal("filter_window");
};

var getDiscordList = function() {
	if (showFuture) {
		var discordDiv = document.getElementById("discord_list"),
		lightCompGames = [],
		medCompGames = [],
		heavyCompGames = [],
		message = [],
		lightStr = [],
		medStr = [],
		heavyStr = [],
		listCode = [],
		lightList = [],
		medList = [],
		heavyList = [];
		
		for (var g = 0; g < boardGames.length; g++) {
			var currGame = boardGames[g];
			
			if (!currGame.wip || showWIP) {
				if (currGame.complexity <= 2.00) {
					lightCompGames.push(currGame);
				} else if (currGame.complexity > 2.00 && currGame.complexity < 3.00) {
					medCompGames.push(currGame);
				} else {
					heavyCompGames.push(currGame);
				}
			}
		}
		lightCompGames.sort(sortForMessage);
		medCompGames.sort(sortForMessage);
		heavyCompGames.sort(sortForMessage);
		
		for (var l = 0; l < lightCompGames.length; l++) {
			if (l == 0) {
				lightStr.push("**Light complexity**:");
				lightList.push("<b>Light complexity</b>:<ul>");
			}
			
			var currLight = lightCompGames[l];
			lightStr.push("* " + formatGameName(currLight, "discord"));
			lightList.push("<li>" + formatGameName(currLight, "html") + "</li>");
			
			if (l == lightCompGames.length - 1)
				lightList.push("</ul>");
		}
		for (var m = 0; m < medCompGames.length; m++) {
			if (m == 0) {
				medStr.push("\n**Medium complexity**:");
				medList.push("<b>Medium complexity</b>:<ul>");
			}
			
			var currMed = medCompGames[m];
			medStr.push("* " + formatGameName(currMed, "discord"));
			medList.push("<li>" + formatGameName(currMed, "html") + "</li>");
			
			if (m == medCompGames.length - 1)
				medList.push("</ul>");
		}
		for (var h = 0; h < heavyCompGames.length; h++) {
			if (h == 0) {
				heavyStr.push("\n**Heavy complexity**:");
				heavyList.push("<b>Heavy complexity</b>:<ul>");
			}
			
			var currHeavy = heavyCompGames[h];
			heavyStr.push("* " + formatGameName(currHeavy, "discord"));
			heavyList.push("<li>" + formatGameName(currHeavy, "html") + "</li>");
			
			if (h == heavyCompGames.length - 1)
				heavyList.push("</ul>");
		}
		
		var currMessage = "",
		sizeLimit = 1780;
		lightStr.forEach((line) => {
			if (currMessage.length + line.length <= sizeLimit) {
				currMessage += (currMessage == "" ? "" : "\n") + line;
			} else {
				message.push(currMessage);
				currMessage = line;
			}
		});
		medStr.forEach((line) => {
			if (currMessage.length + line.length <= sizeLimit) {
				currMessage += (currMessage == "" ? "" : "\n") + line;
			} else {
				message.push(currMessage);
				currMessage = line;
			}
		});
		heavyStr.forEach((line) => {
			if (currMessage.length + line.length <= sizeLimit) {
				currMessage += (currMessage == "" ? "" : "\n") + line;
			} else {
				message.push(currMessage);
				currMessage = line;
			}
		});
		if (currMessage != "") {
			message.push(currMessage);
		}
		
		/*
		message.push(lightStr.join("\n"));
		message.push(medStr.join("\n"));
		message.push(heavyStr.join("\n"));
		*/
		
		message.forEach((block) => {
			console.log(block);
		});
		
		listCode.push(lightList.join(""));
		listCode.push(medList.join(""));
		listCode.push(heavyList.join(""));
		
		discordDiv.innerHTML = listCode.join("");
	}
};

var formatGameName = function(game, format) {
	var fullName = game.name + (game.version != "" ? ", " + game.version : ""),
	gameMarkup = (game.url != "" ? (format == "discord" ? "[" + fullName + "](" + game.url + ")" : "<a href=\"" + game.url + "\">" + fullName + "</a>") : fullName),
	basePlayers = " for " + (game.minPlayers != game.maxPlayers ? game.minPlayers + "-" + game.maxPlayers : game.minPlayers) + " players",
	baseTime = ", " + (game.minTime != game.maxTime ? game.minTime + "-" + game.maxTime : game.minTime) + " minutes";
	
	if (game.expansions.length == 0) {
		return gameMarkup + basePlayers + baseTime;
	} else {
		var allExpSamePlayers = true,
		allExpSameTime = true,
		expNames = [],
		expPlayers = [],
		expTimes = [];
		
		for (var e = 0; e < game.expansions.length; e++) {
			var currExp = game.expansions[e],
			expWords = currExp.name.split(" "),
			lastWord = expWords[expWords.length - 1].toLowerCase(),
			expName = (currExp.name != "" ? currExp.name + (lastWord == "expansion" ? "" : " expansion") : "expansion"),
			expMarkup = (currExp.url != "" ? (format == "discord" ? "[" + expName + "](" + currExp.url + ")" : "<a href=\"" + currExp.url + "\">" + expName + "</a>") : expName),
			expPlayer = " for " + (currExp.minPlayers != currExp.maxPlayers ? currExp.minPlayers + "-" + currExp.maxPlayers : currExp.minPlayers) + " players",
			expTime = ", " + (currExp.minTime != currExp.maxTime ? currExp.minTime + "-" + currExp.maxTime : currExp.minTime) + " minutes";
			
			if (expPlayer != basePlayers) {
				allExpSamePlayers = false;
			}
			if (expTime != baseTime) {
				allExpSameTime = false;
			}
			
			expNames.push(expMarkup);
			expPlayers.push(expPlayer);
			expTimes.push(expTime);
		}
		
		if (allExpSamePlayers) {
			expNames[expNames.length - 1] += basePlayers;
		} else {
			gameMarkup += basePlayers;
			for (var p = 0; p < expPlayers.length; p++) {
				if (expPlayers[p] != basePlayers) {
					expNames[p] += expPlayers[p];
				}
			}
		}
		
		if (allExpSameTime) {
			expNames[expNames.length - 1] += baseTime;
		} else {
			gameMarkup += baseTime;
			for (var t = 0; t < expTimes.length; t++) {
				if (expTimes[t] != baseTime) {
					expNames[t] += expTimes[t];
				}
			}
		}
		
		return gameMarkup + " plus " + englishList(expNames);
	}
};

var englishList = function(arr) {
	if (arr.length === 1)
		return arr[0];
	if (arr.length === 2)
		return arr.join(" and ");

	return arr.slice(0, -1).join(", ") + ", and " + arr.at(-1);
};

var sortForMessage = function(a, b) {
	if (a.name < b.name) {
		return -1;
	} else if (a.name > b.name) {
		return 1;
	} else {
		if (a.complexity < b.complexity) {
			return -1;
		} else if (a.complexity > b.complexity) {
			return 1;
		} else {
			return 0;
		}
	}
};

var setURLTargets = function() {
	var aElements = document.getElementsByTagName("a");
	
	for (var a = 0; a < aElements.length; a++) {
		if (aElements[a].getAttribute("target") == null)
			aElements[a].setAttribute("target", "_blank");
	}
};

var formatCategory = function(category) {
	return "<span class=\"category "+categoryClasses[category]+"\">"+category+"</span>";
};

var formatGameplay = function(gameType) {
	return "<span class=\"category " + categoryClasses[gameType] + "\">" + gameType + "</span>";
};

var toggleHidden = function(elementId) {
	var element = document.getElementById(elementId);
	
	element.classList.toggle("hidden");
};

var toggleWIP = function(buttonElement) {
	showWIP = !showWIP;
	
	generateOwnedTable();
};