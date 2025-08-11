class ImpositionEngine {
    calculateLayout({
        pieceWidth,
        pieceHeight,
        sheetWidth,
        sheetHeight,
        bleeds,
        spacing,
        centerHorizontally,
        useGripperOnBleedMode
    }) {
        // Step 1: Calculate Total Piece Dimensions & Validate Inputs
        const totalPieceWidth = pieceWidth + bleeds.left + bleeds.right;
        const totalPieceHeight = pieceHeight + bleeds.top + bleeds.bottom;
        
        if (pieceWidth <= 0 || pieceHeight <= 0) {
            return { isValid: false, errorMessage: "Piece dimensions must be positive." };
        }
        if (sheetWidth <= 0 || sheetHeight <= 0) {
            return { isValid: true, unitsTotal: 0, unitsX: 0, unitsY: 0, utilization: 0, pieces: [], finalMargins: {}, sheetWidth, sheetHeight };
        }
        if (totalPieceWidth > sheetWidth || totalPieceHeight > sheetHeight) {
            return { isValid: false, errorMessage: "Piece with bleed is larger than the sheet." };
        }

        // Step 2: Determine the Usable Calculation Area
        const calculationAreaWidth = sheetWidth;
        let calculationAreaHeight;
        if (useGripperOnBleedMode) {
            calculationAreaHeight = sheetHeight - (spacing.gripper - bleeds.bottom) - spacing.top_margin;
        } else {
            calculationAreaHeight = sheetHeight - spacing.gripper - spacing.top_margin;
        }
        calculationAreaHeight = Math.max(0, calculationAreaHeight);

        // Step 3: Calculate How Many Pieces Fit
        const denominatorX = totalPieceWidth + spacing.horizontal_gutter;
        const denominatorY = totalPieceHeight + spacing.vertical_gutter;
        const unitsX = denominatorX > 0 ? Math.floor((calculationAreaWidth + spacing.horizontal_gutter) / denominatorX) : 0;
        const unitsY = denominatorY > 0 ? Math.floor((calculationAreaHeight + spacing.vertical_gutter) / denominatorY) : 0;

        if (unitsX < 1 || unitsY < 1) {
            return { isValid: true, unitsTotal: 0, unitsX: 0, unitsY: 0, utilization: 0, pieces: [], finalMargins: {top: calculationAreaHeight, bottom: sheetHeight-calculationAreaHeight, left: sheetWidth, right: 0 }, sheetWidth, sheetHeight };
        }
        const unitsTotal = unitsX * unitsY;

        // Step 4: Calculate Total Occupied Space
        let occupiedWidth;
        if (unitsX > 1 && unitsX % 2 === 0 && spacing.center_horizontal_gutter > 0) {
            occupiedWidth = (unitsX * totalPieceWidth) + ((unitsX - 2) * spacing.horizontal_gutter) + spacing.center_horizontal_gutter;
        } else {
            occupiedWidth = (unitsX * totalPieceWidth) + ((unitsX - 1) * spacing.horizontal_gutter);
        }

        let occupiedHeight;
        if (unitsY > 1 && unitsY % 2 === 0 && spacing.center_vertical_gutter > 0) {
            occupiedHeight = (unitsY * totalPieceHeight) + ((unitsY - 2) * spacing.vertical_gutter) + spacing.center_vertical_gutter;
        } else {
            occupiedHeight = (unitsY * totalPieceHeight) + ((unitsY - 1) * spacing.vertical_gutter);
        }

        // Step 5: Calculate and Distribute Final Margins
        const totalHorizontalSurplus = sheetWidth - occupiedWidth;
        const marginLeft = centerHorizontally ? totalHorizontalSurplus / 2 : 0;
        const marginRight = centerHorizontally ? totalHorizontalSurplus / 2 : totalHorizontalSurplus;

        const verticalSurplusInCalcArea = calculationAreaHeight - occupiedHeight;
        let marginBottom, marginTop;
        if (useGripperOnBleedMode) {
            marginBottom = spacing.gripper - bleeds.bottom;
            marginTop = spacing.top_margin + verticalSurplusInCalcArea;
        } else {
            marginBottom = spacing.gripper;
            marginTop = spacing.top_margin + verticalSurplusInCalcArea;
        }

        // Step 6: Calculate Utilization Percentage
        const totalUsefulArea = unitsTotal * pieceWidth * pieceHeight;
        const totalSheetArea = sheetWidth * sheetHeight;
        const utilization = totalSheetArea > 0 ? (totalUsefulArea / totalSheetArea) * 100 : 0;

        // Step 7: Generate Piece Coordinates (REVISED LOGIC)
        const pieces = [];
        let currentY = marginBottom;

        for (let row = 0; row < unitsY; row++) {
            let currentX = marginLeft;

            for (let col = 0; col < unitsX; col++) {
                pieces.push({
                    x: currentX,
                    y: currentY,
                    width: pieceWidth,
                    height: pieceHeight,
                    totalWidth: totalPieceWidth,
                    totalHeight: totalPieceHeight
                });
                
                currentX += totalPieceWidth;
                if (col < unitsX - 1) {
                    if (unitsX % 2 === 0 && col === (unitsX / 2) - 1 && spacing.center_horizontal_gutter > 0) {
                        currentX += spacing.center_horizontal_gutter;
                    } else {
                        currentX += spacing.horizontal_gutter;
                    }
                }
            }
            
            currentY += totalPieceHeight;
            if (row < unitsY - 1) {
                if (unitsY % 2 === 0 && row === (unitsY / 2) - 1 && spacing.center_vertical_gutter > 0) {
                    currentY += spacing.center_vertical_gutter;
                } else {
                    currentY += spacing.vertical_gutter;
                }
            }
        }
        
        // Step 8: Assemble and Return the Final Result Object
        return {
            isValid: true,
            errorMessage: "",
            unitsTotal,
            unitsX,
            unitsY,
            utilization,
            sheetWidth,
            sheetHeight,
            finalMargins: {
                top: Math.max(0, marginTop),
                bottom: Math.max(0, marginBottom),
                left: Math.max(0, marginLeft),
                right: Math.max(0, marginRight)
            },
            pieces
        };
    }
}