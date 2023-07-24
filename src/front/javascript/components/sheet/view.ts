import {html, render, TemplateResult} from 'lit'
import Datas from './datas.js'
import States from './states.js'
import Sheet from './sheet.js'
import {ElementResizer} from '../../classes/elementResizer.js'
import {ElementManager} from '../../classes/elementManager.js'
import Interface from './interface.js'
import {HTMLElementEvent} from '../../types.js'
import {EInterface} from '../../enum.js'

/**
 * Fonctions de rendu du composant
 */
export default class View {
    static render(): void {
        render(html`
			<style>
				${Datas.sheet.fonts?.map((pFont): string => `
				@font-face {
				font-family: ${pFont.fontFamily};
				src: url(${pFont.fontUrl});
				}
				`)}
			</style>
		`, document.head)
        render(html`			
				<div style="position: relative;width: ${Sheet.containerWidth};height: ${Sheet.containerHeight};" class="wrapper ${States.editMode && 'editMode'} ${States.notepadMode && 'notepadMode'} ${States.interface || EInterface.hover}" @click="${(pEvent: PointerEvent): void => {
    if (States.editMode) ElementManager.select(pEvent)
    if (States.notepadMode) States.displayNotepadMode(false)
}}">
				${States.interface === 'hidden' ? Interface.viewBlock() : ''}
				${States.editMode ? Interface.editBlock() : html`
					<fs-link role="button" class="home contrast" href="/">
						<svg class="home"> 
							<use href="#home"></use>
						</svg>
						<span>Accueil</span>
					</fs-link>
					<button class="edit contrast" @click="${(): void => States.displayEditMode(true)}">Éditer</button>
					<button class="notepad contrast ${States.notepadMode && 'selected'}" @click="${(pEvent: PointerEvent): void => {
    pEvent.stopPropagation()
    States.displayNotepadMode(!States.notepadMode)
}}">Bloc notes</button>
					<button class="print contrast" @click="${(): Promise<void> => Sheet.printScreen()}">
						<svg class="print"> 
							<use href="#print"></use>
						</svg>
						<span>Imprimer</span>
					</button>
					${States.notepadMode ? html`
					<article id="notepad" @click="${(pEvent: PointerEvent): void => pEvent.stopPropagation()}">
						<textarea @change="${(pEvent: HTMLElementEvent<HTMLTextAreaElement>): Promise<void> => Datas.saveNotepad(pEvent.target.value)}">${Datas.sheet.notepad}</textarea>
					</article>
					` : ''}
				`}
				${Datas.sheet.inputs?.map((pInput): TemplateResult => html`
							<label for="${pInput.id}" style="transform: translate(${pInput.x * Sheet.ratio}px, ${pInput.y * Sheet.ratio}px);" class="${ElementManager.selectedElementId === pInput.id ? 'selected' : ''}">
								${pInput.type === 'textarea' ? html`
									<textarea
											id="${pInput.id}"
											name="${pInput.id}"
											style="font-size: ${pInput.fontSize * Sheet.ratio}px;width: ${pInput.width * Sheet.ratio}px;height: ${pInput.height * Sheet.ratio}px;color: ${pInput.color};text-align: ${pInput.textAlign};font-family: ${pInput.fontFamily};"
											@change="${(pEvent: HTMLElementEvent<HTMLTextAreaElement>): Promise<void> => Datas.addAndSaveInput(pInput, 'value', pEvent.target.value)}"
											?readonly="${States.editMode}"
											@click="${(pEvent: PointerEvent): void => ElementManager.select(pEvent, pInput)}"
									>${pInput.value}</textarea>
								` : html`
									<input
											type="${pInput.type}"
											id="${pInput.id}"
											name="${pInput.id}"
											value="${pInput.value}"
											style="font-size: ${pInput.fontSize * Sheet.ratio}px;width: ${pInput.width * Sheet.ratio}px;height: ${pInput.height * Sheet.ratio}px;color: ${pInput.color};text-align: ${pInput.textAlign};font-family: ${pInput.fontFamily};"
											@change="${(pEvent: HTMLElementEvent<HTMLInputElement>): Promise<void> => Datas.addAndSaveInput(pInput, 'value', pEvent.target.value)}"
											?readonly="${States.editMode}"
											@click="${(pEvent: PointerEvent): void => ElementManager.select(pEvent, pInput)}"
									/>
								`}
								${ElementResizer.boxPositions.map((pBoxPosition): TemplateResult => html`<div .hidden="${ElementManager.selectedElementId !== pInput.id}" class="resizeHandler ${pBoxPosition.class}" />`)}
							</label>
							${ElementManager.selectedElementId === pInput.id ? Interface.selectBlock(pInput) : ''}
						`
    )}
				${Datas.sheet.images?.map((pImage): TemplateResult => html`
							<div id="${pImage.id}" style="transform: translate(${<number>pImage.x * Sheet.ratio}px, ${<number>pImage.y * Sheet.ratio}px);width: ${<number>pImage.width * Sheet.ratio}px;height: ${<number>pImage.height * Sheet.ratio}px;" class="image ${ElementManager.selectedElementId === pImage.id ? 'selected' : ''} ${States.isZoomed === pImage.id ? 'isZoomed' : ''}" @click="${(pEvent: PointerEvent): void => {
    if (States.editMode) ElementManager.select(pEvent, pImage)
    else {
        if (!States.isZoomed) States.isZoomed = pImage.id
        else States.isZoomed = false
        View.render()
    }
}}">
								<div style="background-image: url(${pImage.image});"></div>
								${ElementResizer.boxPositions.map((pBoxPosition): TemplateResult => html`<div .hidden="${ElementManager.selectedElementId !== pImage.id}" class="resizeHandler ${pBoxPosition.class}" />`)}
							</div>
							${ElementManager.selectedElementId === pImage.id ? Interface.selectBlock(pImage) : ''}
						`
    )}
			</div>
		`, Sheet.element)
        ElementManager.init()
    }
}
