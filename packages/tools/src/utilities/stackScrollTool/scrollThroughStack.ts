import {
  getEnabledElement,
  StackViewport,
  VolumeViewport,
  utilities as csUtils,
} from '@cornerstonejs/core';
import clip from '../clip';
import getSliceRange from './getSliceRange';
import snapFocalPointToSlice from './snapFocalPointToSlice';
import {
  MouseDragEventType,
  MouseWheelEventType,
} from '../../types/EventTypes';

/**
 * Scroll the stack defined by the event (`evt`)
 * and volume with `volumeId` `deltaFrames number of frames`.
 * Frames are defined as increasing in the view direction.
 *
 * @param evt - The event corresponding to an interaction with a
 * specific viewport.
 * @param deltaFrames - The number of frames to jump through.
 * @param volumeId - The `volumeId` of the volume to scroll through
 * @param invert - inversion of the scrolling
 * on the viewport.
 */
export default function scrollThroughStack(
  evt: MouseWheelEventType | MouseDragEventType,
  deltaFrames: number,
  volumeId: string,
  invert = false
): void {
  const { element } = evt.detail;
  const { viewport } = getEnabledElement(element);
  const { type: viewportType } = viewport;
  const camera = viewport.getCamera();
  const { focalPoint, viewPlaneNormal, position } = camera;
  const delta = invert ? -deltaFrames : deltaFrames;

  if (viewport instanceof StackViewport) {
    // stack viewport
    const currentImageIdIndex = viewport.getCurrentImageIdIndex();
    const numberOfFrames = viewport.getImageIds().length;
    let newImageIdIndex = currentImageIdIndex + delta;
    newImageIdIndex = clip(newImageIdIndex, 0, numberOfFrames - 1);

    viewport.setImageIdIndex(newImageIdIndex);
  } else if (viewport instanceof VolumeViewport) {
    // If volumeId is specified, scroll through that specific volume
    const { spacingInNormalDirection, imageVolume } =
      csUtils.getTargetVolumeAndSpacingInNormalDir(viewport, camera, volumeId);

    if (!imageVolume) {
      return;
    }

    const actor = viewport.getActor(imageVolume.volumeId);

    if (!actor) {
      console.warn('No actor found for with actorUID of', imageVolume.volumeId);
    }

    const { volumeActor } = actor;
    const scrollRange = getSliceRange(volumeActor, viewPlaneNormal, focalPoint);

    const { newFocalPoint, newPosition } = snapFocalPointToSlice(
      focalPoint,
      position,
      scrollRange,
      viewPlaneNormal,
      spacingInNormalDirection,
      delta
    );

    viewport.setCamera({
      focalPoint: newFocalPoint,
      position: newPosition,
    });
    viewport.render();
  } else {
    throw new Error(`Not implemented for Viewport Type: ${viewportType}`);
  }
}
